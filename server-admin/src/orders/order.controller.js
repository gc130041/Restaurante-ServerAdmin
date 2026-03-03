import Order from "./order.model.js";
import Table from "../tables/table.model.js";

const VALID_TRANSITIONS = {
    "EN_ESPERA": ["EN_COCINA"],
    "EN_COCINA": ["LISTO"],
    "LISTO": ["SERVIDO"],
    "SERVIDO": []
};

export const createOrder = async (req, res) => {
    try {
        const { table, restaurant, items } = req.body;
        const waiter = req.usuario._id; 

        const tableUpdate = await Table.findOneAndUpdate(
            { _id: table, status: "Disponible" }, 
            { $set: { status: "Ocupada" } },
            { new: true }
        );

        if (!tableUpdate) {
            return res.status(400).json({
                success: false,
                message: "Mesa no disponible o ya ocupada."
            });
        }

        const newOrder = new Order({ table, waiter, restaurant, items });
        await newOrder.save();

        res.status(201).json({ success: true, order: newOrder });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateItemStatus = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { status: nextStatus } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });

        const item = order.items.id(itemId);
        if (!item) return res.status(404).json({ success: false, message: "Ítem no encontrado" });

        if (!VALID_TRANSITIONS[item.status]?.includes(nextStatus)) {
            return res.status(400).json({
                success: false, 
                message: `No se puede pasar de ${item.status} a ${nextStatus}`
            });
        }

        item.status = nextStatus;
        await order.save();

        res.status(200).json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
        if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });

        if (status === "CERRADA" || status === "CANCELADA") {
            await Table.findByIdAndUpdate(order.table, { $set: { status: "Disponible" } });
        }

        res.status(200).json({ success: true, message: "Estado actualizado y mesa sincronizada" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};