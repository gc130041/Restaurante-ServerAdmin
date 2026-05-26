'use strict';

import mongoose from 'mongoose';
import Menu from './menu.model.js';

/**
 * Listar platillos del menú filtrados por tenant.
 */
export const getMenus = async (req, res, next) => {
    try {
        const filter = { ...req.tenantFilter, isActive: true };
        
        // Filtros adicionales por query
        if (req.query.branch) filter.branch = req.query.branch;
        if (req.query.category) filter.category = req.query.category;

        const menus = await Menu.find(filter)
            .populate('branch', 'name')
            .sort({ category: 1, name: 1 });

        res.status(200).json({
            success: true,
            total: menus.length,
            data: menus
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Obtener detalle de un plato.
 */
export const getMenuById = async (req, res, next) => {
    try {
        const menu = req.resource || await Menu.findOne({ _id: req.params.id, ...req.tenantFilter });
        
        if (!menu) {
            return res.status(404).json({ success: false, message: 'Plato no encontrado' });
        }

        res.status(200).json({ success: true, data: menu });
    } catch (error) {
        next(error);
    }
};

/**
 * Crear nuevo plato en el menú vinculado al tenant.
 */
export const createMenu = async (req, res, next) => {
    try {
        let companyId = req.companyId;

        // If companyId is not in token (e.g. SUPER_ADMIN), fetch it from the branch
        if (!companyId && req.body.branch) {
            const branchObj = await mongoose.model('Branch').findById(req.body.branch).lean();
            if (branchObj) {
                companyId = branchObj.companyId;
            }
        }

        const menuData = { 
            ...req.body, 
            companyId: companyId,
            branchId: req.body.branch
        };

        // If SKU is missing, generate a unique one
        if (!menuData.sku) {
            const catPrefix = (req.body.category || 'GEN').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
            const namePrefix = (req.body.name || 'ITEM').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '');
            const timestamp = Date.now().toString().slice(-4);
            const random = Math.floor(100 + Math.random() * 900);
            menuData.sku = `${catPrefix}-${namePrefix}-${timestamp}${random}`;
        }

        if (req.file) {
            menuData.image = req.file.path; // Cloudinary URL
        }

        const menu = new Menu(menuData);
        await menu.save();

        res.status(201).json({
            success: true,
            message: 'Plato creado exitosamente',
            data: menu
        });
    } catch (error) {
        next(error);
    }
};

export const updateMenu = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (req.body.branch) {
            updateData.branchId = req.body.branch;
        }

        if (req.file) {
            updateData.image = req.file.path;
        } else if (req.body.removeImage === "true") {
            updateData.image = 'menus/default_menu';
        }

        const menu = await Menu.findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true });

        res.status(200).json({
            success: true,
            message: 'Plato actualizado exitosamente',
            data: menu
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cambiar estado del plato (Soft Delete).
 */
export const changeMenuStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isActive = req.url.includes('/activate');
        
        const menu = await Menu.findByIdAndUpdate(id, { isActive }, { returnDocument: 'after' });

        res.status(200).json({
            success: true,
            message: `Plato ${isActive ? 'activado' : 'desactivado'} exitosamente`,
            data: menu
        });
    } catch (error) {
        next(error);
    }
};