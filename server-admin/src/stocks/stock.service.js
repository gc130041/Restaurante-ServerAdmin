import mongoose from 'mongoose';
import Stock from './stock.model.js';
import Menu from '../menus/menu.model.js';

const checkReplicaSet = async () => {
    try {
        const client = mongoose.connection.client;
        if (client && client.topology && client.topology.description) {
            const type = client.topology.description.type;
            if (type === 'ReplicaSetNoPrimary' || type === 'ReplicaSetWithPrimary' || type === 'Sharded') {
                return true;
            }
        }
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        return !!(hello.setName || hello.hosts);
    } catch (e) {
        return false;
    }
};


/**
 * Desempaqueta combos en sus ítems individuales (SINGLE) recursivamente.
 * Un COMBO se reemplaza por sus sub-ítems con las cantidades multiplicadas.
 * 
 * @param {Array} items - [{ menuItem (ObjectId), quantity (Number) }]
 * @param {ClientSession} [session] - Sesión de Mongoose para transacciones.
 * @param {Set} [visited] - Set de IDs ya visitados para evitar ciclos infinitos.
 * @returns {Array} - Array plano de ítems SINGLE [{ menuItem, quantity }]
 */
const flattenOrderItems = async (items, session = null, visited = new Set()) => {
    const flatItems = [];
    const menuItemIds = items.map(i => i.menuItem);
    const query = Menu.find({ _id: { $in: menuItemIds } }).select('itemType recipe comboItems');
    if (session) query.session(session);
    const menus = await query;

    for (const item of items) {
        const menu = menus.find(m => m._id.toString() === item.menuItem.toString());
        if (!menu) continue;

        if (menu.itemType === 'SINGLE') {
            // Acumular: si el mismo SINGLE aparece varias veces, sumar quantities
            const existing = flatItems.find(f => f.menuItem.toString() === item.menuItem.toString());
            if (existing) {
                existing.quantity += item.quantity;
            } else {
                flatItems.push({ menuItem: item.menuItem, quantity: item.quantity });
            }
        } else if (menu.itemType === 'COMBO') {
            const menuId = menu._id.toString();
            if (visited.has(menuId)) {
                throw new Error(`Referencia circular detectada en combo: ${menuId}`);
            }
            visited.add(menuId);

            // Desempaquetar: cada comboItem se multiplica por la quantity del combo
            const subItems = menu.comboItems.map(ci => ({
                menuItem: ci.menuItemId,
                quantity: ci.quantity * item.quantity
            }));

            // Recursión: un combo podría contener otro combo
            const resolved = await flattenOrderItems(subItems, session, visited);
            
            for (const resolved_item of resolved) {
                const existing = flatItems.find(f => f.menuItem.toString() === resolved_item.menuItem.toString());
                if (existing) {
                    existing.quantity += resolved_item.quantity;
                } else {
                    flatItems.push(resolved_item);
                }
            }
        }
    }
    return flatItems;
};

/**
 * Gestiona la deducción o restauración de inventario basada en los ítems de una orden.
 * Soporta COMBOS desempaquetándolos automáticamente.
 * 
 * @param {string} branchId - ID de la sucursal donde se opera.
 * @param {Array} items - Arreglo de ítems [{ menuItem, quantity }].
 * @param {string} mode - 'DEDUCT' para restar, 'RESTORE' para sumar.
 */
const processStockUpdate = async (branchId, items, mode = 'DEDUCT') => {
    let session = null;
    try {
        const hasReplicaSet = await checkReplicaSet();
        if (hasReplicaSet) {
            session = await mongoose.startSession();
            session.startTransaction();
        } else {
            console.warn("MongoDB replica set not detected. Running processStockUpdate without transaction session.");
        }
    } catch (sessionError) {
        console.warn("MongoDB replica set check failed or session failed. Running without transaction.");
        session = null;
    }
    try {
        const isDeduct = mode === 'DEDUCT';
        
        // Desempaquetar combos en ítems individuales SINGLE
        const flatItems = await flattenOrderItems(items, session);

        // 1. Obtener recetas de todos los platillos SINGLE resultantes
        const menuItemIds = flatItems.map(i => i.menuItem);
        const menusQuery = Menu.find({ _id: { $in: menuItemIds } })
            .select('name recipe')
            .populate('recipe.ingredientId', 'name unit');
            
        if (session) menusQuery.session(session);
        const menus = await menusQuery;

        // 2. Calcular demanda consolidada por ingrediente
        const demand = new Map();
        for (const item of flatItems) {
            const menu = menus.find(m => m._id.toString() === item.menuItem.toString());
            if (!menu || !menu.recipe?.length) continue;

            for (const recipeItem of menu.recipe) {
                const ingId = recipeItem.ingredientId._id.toString();
                const needed = recipeItem.quantityRequired * item.quantity;
                const current = demand.get(ingId) || { 
                    totalAmount: 0, 
                    name: recipeItem.ingredientId.name 
                };
                current.totalAmount += needed;
                demand.set(ingId, current);
            }
        }

        // 3. Validar y actualizar stock
        const insufficientItems = [];
        for (const [ingredientId, { totalAmount, name }] of demand) {
            const stockQuery = Stock.findOne({ branchId, ingredientId });
            if (session) stockQuery.session(session);
            const stock = await stockQuery;

            if (isDeduct) {
                if (!stock || stock.quantity < totalAmount) {
                    insufficientItems.push({
                        ingredient: name,
                        available: stock?.quantity || 0,
                        needed: totalAmount
                    });
                    continue;
                }
                stock.quantity -= totalAmount;
            } else {
                if (stock) {
                    stock.quantity += totalAmount;
                }
            }

            if (stock) {
                if (session) {
                    await stock.save({ session });
                } else {
                    await stock.save();
                }
                // Alerta de stock bajo
                if (isDeduct && stock.quantity <= stock.minStock) {
                    console.warn(`[Inventory Alert] Stock bajo: ${name} en sucursal ${branchId}. Quedan: ${stock.quantity}`);
                }
            }
        }

        if (insufficientItems.length > 0) {
            if (session) await session.abortTransaction();
            const detail = insufficientItems.map(i => `${i.ingredient}: necesitas ${i.needed}, hay ${i.available}`).join('; ');
            throw new Error(`Stock insuficiente: ${detail}`);
        }

        if (session) {
            await session.commitTransaction();
        }
    } catch (error) {
        if (session && session.inTransaction()) await session.abortTransaction();
        throw error;
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

/**
 * Descuenta ingredientes del stock para una lista de items de orden.
 * @param {string} branchId 
 * @param {Array} items 
 */
export const deductStockForItems = async (branchId, items) => {
    return await processStockUpdate(branchId, items, 'DEDUCT');
};

/**
 * Restaura stock cuando se cancela una orden o un ítem.
 * @param {string} branchId 
 * @param {Array} items 
 */
export const restoreStockForItems = async (branchId, items) => {
    return await processStockUpdate(branchId, items, 'RESTORE');
};
