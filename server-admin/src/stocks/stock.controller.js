import Stock from './stock.model.js';
import Branch from '../branchs/branch.model.js';
import StockAudit from './stockAudit.model.js';

export const getStocks = async (req, res, next) => {
    try {
        let filter = {};
        const companyId = req.companyId || req.user?.companyId;
        const branchId = req.branchId || req.user?.branchId;

        if (req.user?.role === 'COMPANY_ADMIN' && companyId) {
            // Get all branches of the company
            const branches = await Branch.find({ companyId: companyId });
            const branchIds = branches.map(b => b._id);
            filter = { branchId: { $in: branchIds } };
        } else if (req.user?.role !== 'SUPER_ADMIN' && branchId) {
            filter = { branchId: branchId };
        }
        
        const stocks = await Stock.find(filter)
            .populate('ingredientId')
            .populate('branchId', 'name'); // Also populate branch name!
        res.status(200).json({ success: true, data: stocks });
    } catch (error) {
        next(error);
    }
};

export const createOrUpdateStock = async (req, res, next) => {
    try {
        const { ingredientId, quantity, minStock, reason = 'Registro inicial de stock' } = req.body;
        const branchId = req.branchId || req.user?.branchId || req.body.branchId;

        // Verificar si ya existe para auditar
        const existingStock = await Stock.findOne({ branchId, ingredientId });

        let stock;
        let action = 'STOCK_CREATED';
        let prevQty = 0;
        let prevMin = 0;

        if (existingStock) {
            action = 'STOCK_UPDATED';
            prevQty = existingStock.quantity;
            prevMin = existingStock.minStock;

            existingStock.quantity = quantity;
            existingStock.minStock = minStock;
            stock = await existingStock.save();
        } else {
            stock = new Stock({ branchId, ingredientId, quantity, minStock });
            await stock.save();
        }

        await stock.populate('ingredientId');

        // Registro de Auditoría
        let companyId = req.companyId || req.user?.companyId;
        if (!companyId && branchId) {
            const branchObj = await Branch.findById(branchId).lean();
            if (branchObj) companyId = branchObj.companyId;
        }

        const actorName = `${req.user?.name || ''} ${req.user?.surname || ''}`.trim() || req.user?.email?.split('@')[0] || 'Sistema';

        await StockAudit.create({
            stockId: stock._id,
            ingredientId: stock.ingredientId._id || stock.ingredientId,
            actorId: req.user?._id || 'system',
            actorRole: req.user?.role || 'SYSTEM',
            actorName: actorName,
            action: action,
            details: {
                previousQuantity: prevQty,
                newQuantity: quantity,
                previousMinStock: prevMin,
                newMinStock: minStock,
                reason: reason,
                description: action === 'STOCK_CREATED' ? 'Creación de registro de inventario.' : 'Actualización de inventario (upsert).'
            },
            branchId: branchId,
            companyId: companyId,
            ipAddress: req.ip
        });

        res.status(200).json({ success: true, data: stock });
    } catch (error) {
        next(error);
    }
};

export const updateStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { quantity, minStock, reason } = req.body;

        if (!reason) {
            return res.status(400).json({ success: false, message: 'El motivo de la modificación es obligatorio.' });
        }

        const stock = await Stock.findById(id);
        if (!stock) {
            return res.status(404).json({ success: false, message: 'Stock no encontrado.' });
        }

        // Validación de propiedad (Multitenancy)
        if (req.user?.role !== 'SUPER_ADMIN') {
            if (req.user?.role === 'COMPANY_ADMIN') {
                const branchObj = await Branch.findById(stock.branchId).lean();
                if (!branchObj || branchObj.companyId?.toString() !== req.user?.companyId?.toString()) {
                    return res.status(403).json({ success: false, message: 'No tienes permiso sobre esta empresa.' });
                }
            } else if (req.user?.role === 'BRANCH_MANAGER') {
                if (stock.branchId?.toString() !== req.user?.branchId?.toString()) {
                    return res.status(403).json({ success: false, message: 'No tienes permiso sobre esta sucursal.' });
                }
            }
        }

        const prevQty = stock.quantity;
        const prevMin = stock.minStock;

        // Detectar tipo de acción específica
        let action = 'QUANTITY_ADJUSTED';
        if (prevMin !== minStock && prevQty === quantity) {
            action = 'MIN_STOCK_CHANGED';
        } else if (prevMin !== minStock && prevQty !== quantity) {
            action = 'STOCK_UPDATED';
        }

        stock.quantity = quantity;
        stock.minStock = minStock;
        await stock.save();
        await stock.populate('ingredientId');

        // Registro de Auditoría
        let companyId = req.companyId || req.user?.companyId;
        if (!companyId && stock.branchId) {
            const branchObj = await Branch.findById(stock.branchId).lean();
            if (branchObj) companyId = branchObj.companyId;
        }

        const actorName = `${req.user?.name || ''} ${req.user?.surname || ''}`.trim() || req.user?.email?.split('@')[0] || 'Sistema';

        await StockAudit.create({
            stockId: stock._id,
            ingredientId: stock.ingredientId._id || stock.ingredientId,
            actorId: req.user?._id || 'system',
            actorRole: req.user?.role || 'SYSTEM',
            actorName: actorName,
            action: action,
            details: {
                previousQuantity: prevQty,
                newQuantity: quantity,
                previousMinStock: prevMin,
                newMinStock: minStock,
                reason: reason,
                description: `Modificación manual de stock: ${action}.`
            },
            branchId: stock.branchId,
            companyId: companyId,
            ipAddress: req.ip
        });

        res.status(200).json({ success: true, data: stock });
    } catch (error) {
        next(error);
    }
};

export const getStockAuditLog = async (req, res, next) => {
    try {
        const { stockId } = req.params;
        const stock = await Stock.findById(stockId);
        if (!stock) {
            return res.status(404).json({ success: false, message: 'Stock no encontrado.' });
        }

        // Validación de propiedad (Multitenancy)
        if (req.user?.role !== 'SUPER_ADMIN') {
            if (req.user?.role === 'COMPANY_ADMIN') {
                const branchObj = await Branch.findById(stock.branchId).lean();
                if (!branchObj || branchObj.companyId?.toString() !== req.user?.companyId?.toString()) {
                    return res.status(403).json({ success: false, message: 'No tienes permiso sobre esta empresa.' });
                }
            } else if (req.user?.role === 'BRANCH_MANAGER') {
                if (stock.branchId?.toString() !== req.user?.branchId?.toString()) {
                    return res.status(403).json({ success: false, message: 'No tienes permiso sobre esta sucursal.' });
                }
            }
        }

        const logs = await StockAudit.find({ stockId }).sort({ performedAt: -1 });
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        next(error);
    }
};
