'use strict';

import mongoose from 'mongoose';
import Menu from './menu.model.js';

export const getMenus = async (req, res) => {
    try {
        const { restaurant, category, isActive } = req.query;

        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (restaurant) filter.restaurant = restaurant;
        if (category) filter.category = category;

        const menus = await Menu.find(filter)
            .populate('restaurant', 'name')
            .sort({ category: 1 });

        res.status(200).json({
            success: true,
            total: menus.length,
            data: menus
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el menú',
            error: error.message
        });
    }
};

export const getMenuById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const menu = await Menu.findById(id).populate('restaurant', 'name');

        if (!menu) {
            return res.status(404).json({ success: false, message: 'Plato no encontrado' });
        }

        res.status(200).json({ success: true, data: menu });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const createMenu = async (req, res) => {
    try {
        const menuData = req.body;

        if (req.file) {
            const extension = req.file.path.split('.').pop();
            const fileName = req.file.filename;
            const relativePath = fileName.substring(fileName.indexOf('menus/'));
            menuData.image = `${relativePath}.${extension}`;
        }

        const menu = new Menu(menuData);
        await menu.save();

        res.status(201).json({
            success: true,
            message: 'Plato creado exitosamente en el menú',
            data: menu
        });
    } catch (error) {
        res.status(500).json({
            succes: false,
            message: 'Error al crear el plato',
            error: error.message
        });
    }
};

export const updateMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        if (req.file) {
            const extension = req.file.path.split('.').pop();
            const fileName = req.file.filename;
            const relativePath = fileName.substring(fileName.indexOf('menus/'));
            updateData.image = `${relativePath}.${extension}`;
        }

        const menu = await Menu.findByIdAndUpdate(id, updateData, { new: true });

        if (!menu) {
            return res.status(404).json({ success: false, message: 'Plato no encontrado' });
        }

        res.status(200).json({
            success: true,
            message: 'Plato actualizado exitosamente',
            data: menu
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error al actualizar el plato',
            error: error.message
        });
    }
};

export const changeMenuStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = req.url.includes('/activate');
        const action = isActive ? 'activado' : 'desactivado';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const menu = await Menu.findByIdAndUpdate(id, { isActive }, { new: true });

        if (!menu) {
            return res.status(404).json({ success: false, message: 'Plato no encontrado' });
        }

        res.status(200).json({
            success: true,
            message: `Plato ${action} exitosamente`,
            data: menu
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado del plato',
            error: error.message
        });
    }
};