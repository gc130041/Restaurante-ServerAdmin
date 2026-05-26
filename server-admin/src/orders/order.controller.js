import mongoose from "mongoose";
import Order from "./order.model.js";
import Table from "../tables/table.model.js";
import { deductStockForItems, restoreStockForItems } from "../stocks/stock.service.js";
import Menu from "../menus/menu.model.js";
import OrderAudit from './orderAudit.model.js';

const VALID_TRANSITIONS = {
    "pending": ["in-kitchen", "cancelled"],
    "in-kitchen": ["ready", "cancelled"],
    "ready": ["delivered", "cancelled"],
    "delivered": ["paid", "cancelled"],
    "paid": [],
    "cancelled": []
};

/**
 * Obtiene órdenes activas de una sucursal específica.
 */
export const getActiveOrdersByBranch = async (req, res, next) => {
    try {
        const { branchId } = req.params;
        const orders = await Order.find({
            branch: branchId,
            status: { $nin: ["paid", "cancelled"] }
        })
        .populate('tables')
        .populate('items.menuItem', 'name price')
        .populate('waiter', 'name surname');
        res.status(200).json({ success: true, data: orders });
    } catch (error) {
        next(error);
    }
};

/**
 * Crea una nueva orden y ocupa las mesas correspondientes.
 */
export const createOrder = async (req, res) => {
    let tablesUpdated = false;
    const { tables, branch, items } = req.body;
    try {
        const waiter = req.user._id;

        // Validar disponibilidad de mesas
        const tableUpdates = await Table.updateMany(
            { _id: { $in: tables }, status: "Disponible" },
            { $set: { status: "Ocupada" } }
        );

        if (tableUpdates.modifiedCount !== tables.length) {
            throw new Error("Una o más mesas seleccionadas no están disponibles.");
        }
        tablesUpdated = true;

        // Snapshot de precios actuales para la orden
        for (const item of items) {
            const menu = await Menu.findById(item.menuItem);
            if (!menu) throw new Error(`El platillo ${item.menuItem} no existe.`);
            // Usar effectivePrice del virtual para considerar promociones
            item.priceAtTime = menu.effectivePrice ?? menu.price;
        }

        const newOrder = new Order({ tables, waiter, branch, items });
        await newOrder.save();

        // Resolve companyId dynamically (e.g. for SUPER_ADMIN)
        let companyId = req.companyId || req.body.companyId || req.user?.companyId;
        if (!companyId && branch) {
            const branchObj = await mongoose.model('Branch').findById(branch).lean();
            if (branchObj) {
                companyId = branchObj.companyId;
            }
        }

        // Obtener nombres/números de mesa para auditoría
        const tableObjs = await Table.find({ _id: { $in: tables } }).lean();
        const tableNumbers = tableObjs.map(t => t.number || t._id).join(', ');

        const actorName = `${req.user.name || ''} ${req.user.surname || ''}`.trim() || req.user.email.split('@')[0];

        // Registro de auditoría
        await OrderAudit.create([{
            orderId:   newOrder._id,
            actorId:   req.user._id,
            actorRole: req.user.role,
            actorName: actorName,
            action:    'ORDER_CREATED',
            details: {
                description: `Orden creada con ${items.length} ítems en mesa(s) ${tableNumbers}`
            },
            branchId:  branch,
            companyId: companyId,
            ipAddress: req.ip
        }]);

        res.status(201).json({ success: true, order: newOrder });
    } catch (error) {
        console.error("CREATE ORDER ERROR STACK:", error);
        // Rollback tables status if they were updated
        if (tablesUpdated) {
            try {
                await Table.updateMany(
                    { _id: { $in: tables } },
                    { $set: { status: "Disponible" } }
                );
            } catch (rollbackError) {
                console.error("Failed to rollback tables status:", rollbackError);
            }
        }
        res.status(400).json({ success: false, message: error.message });
    }
};


/**
 * Actualiza el estado de un ítem individual dentro de una orden.
 * Dispara la lógica de inventario si el ítem entra a cocina o se cancela.
 */
export const updateItemStatus = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { status: nextStatus } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Ítem no encontrado" });

        // Validar transición de estado
        if (!VALID_TRANSITIONS[item.status]?.includes(nextStatus)) {
            return res.status(400).json({
                success: false,
                message: `Transición no permitida: de ${item.status} a ${nextStatus}`
            });
        }

        const previousStatus = item.status;

        // GESTIÓN DE STOCK
        // 1. Descontar stock si entra a cocina
        if (nextStatus === "in-kitchen" && previousStatus === "pending") {
            await deductStockForItems(order.branch, [{ menuItem: item.menuItem, quantity: item.quantity }]);
        }
        
        // 2. Restaurar stock si se cancela un ítem que ya estaba en proceso
        if (nextStatus === "cancelled" && ["in-kitchen", "ready", "delivered"].includes(previousStatus)) {
            await restoreStockForItems(order.branch, [{ menuItem: item.menuItem, quantity: item.quantity }]);
        }

        item.status = nextStatus;

        // Obtener nombre del platillo para auditoría
        const menuItemObj = await Menu.findById(item.menuItem).lean();
        const menuItemName = menuItemObj ? menuItemObj.name : 'Platillo';

        const actorName = `${req.user.name || ''} ${req.user.surname || ''}`.trim() || req.user.email.split('@')[0];

        // Registro de auditoría
        await OrderAudit.create({
            orderId:   order._id,
            actorId:   req.user._id,
            actorRole: req.user.role,
            actorName: actorName,
            action:    'ITEM_STATUS_CHANGED',
            details: {
                menuItemId:     item.menuItem,
                previousStatus: previousStatus,
                newStatus:      nextStatus,
                description:    `Platillo "${menuItemName}" cambió de "${previousStatus}" a "${nextStatus}"`
            },
            branchId:  order.branch,
            companyId: req.companyId || req.user?.companyId,
            ipAddress: req.ip
        });

        await order.save();

        res.status(200).json({ success: true, order });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Actualiza el estado global de la orden.
 * Si se cancela, libera mesas y restaura stock de ítems procesados.
 */
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status: nextStatus } = req.body;

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });

        const previousStatus = order.status;

        // Si se cancela la orden globalmente
        if (nextStatus === "cancelled" && previousStatus !== "cancelled") {
            // Liberar mesas
            await Table.updateMany({ _id: { $in: order.tables } }, { $set: { status: "Disponible" } });
            
            // Restaurar stock de todos los ítems que ya estaban descontados (in-kitchen en adelante)
            const itemsToRestore = order.items.filter(item => 
                ["in-kitchen", "ready", "delivered"].includes(item.status)
            );
            
            if (itemsToRestore.length > 0) {
                await restoreStockForItems(order.branch, itemsToRestore);
            }
            
            // Marcar todos los ítems como cancelados
            order.items.forEach(item => item.status = "cancelled");
        }

        // Si se paga la orden
        if (nextStatus === "paid") {
            await Table.updateMany({ _id: { $in: order.tables } }, { $set: { status: "Disponible" } });
            order.items.forEach(item => { if (item.status !== 'cancelled') item.status = "paid"; });
        }

        order.status = nextStatus;

        const actorName = `${req.user.name || ''} ${req.user.surname || ''}`.trim() || req.user.email.split('@')[0];

        // Registro de auditoría
        await OrderAudit.create({
            orderId:   order._id,
            actorId:   req.user._id,
            actorRole: req.user.role,
            actorName: actorName,
            action:    nextStatus === 'cancelled' ? 'ORDER_CANCELLED' : 'ORDER_STATUS_CHANGED',
            details: {
                previousStatus: previousStatus,
                newStatus:      nextStatus,
                description:    nextStatus === 'cancelled'
                    ? `Orden cancelada (estado previo: "${previousStatus}"). Mesas liberadas. Stock restaurado para ${order.items.filter(i => ['in-kitchen','ready','delivered'].includes(i.status)).length} ítems.`
                    : `Estado de orden cambió de "${previousStatus}" a "${nextStatus}"`
            },
            branchId:  order.branch,
            companyId: req.companyId || req.user?.companyId,
            ipAddress: req.ip
        });

        await order.save();

        res.status(200).json({ success: true, message: "Estado de orden actualizado correctamente", order });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Obtiene el historial de auditoría de una orden específica.
 * GET /orders/:orderId/audit
 */
export const getOrderAuditLog = async (req, res, next) => {
    try {
        const { orderId } = req.params;
        const auditLog = await OrderAudit.find({ orderId })
            .sort({ performedAt: -1 })
            .populate('actorId', 'name surname role')
            .lean();
        res.status(200).json({ success: true, data: auditLog, count: auditLog.length });
    } catch (error) {
        next(error);
    }
};