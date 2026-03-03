'use strict';

import mongoose from 'mongoose';
import Table from './table.model.js';

export const getTables = async (req, res) => {
    try {
        const { restaurant, status, isActive } = req.query;
        
        const filter = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (status) filter.status = status;
        if (restaurant) filter.restaurant = restaurant;

        const tables = await Table.find(filter)
            .populate('restaurant', 'name') 
            .sort({ number: 1 });

        res.status(200).json({
            success: true,
            total: tables.length,
            data: tables
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el inventario de mesas',
            error: error.message
        });
    }
};

export const getTableById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const table = await Table.findById(id).populate('restaurant', 'name');

        if (!table) {
            return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
        }

        res.status(200).json({ success: true, data: table });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const createTable = async (req, res) => {
    try {
        const tableData = req.body;

        const table = new Table(tableData);
        await table.save();

        res.status(201).json({
            success: true,
            message: 'Mesa registrada exitosamente en el inventario',
            data: table
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al registrar la mesa',
            error: error.message
        });
    }
};

export const updateTable = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const table = await Table.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!table) {
            return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
        }

        res.status(200).json({
            success: true,
            message: 'Mesa actualizada correctamente',
            data: table
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error al actualizar la mesa',
            error: error.message
        });
    }
};

export const changeTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = req.url.includes('/activate');
        const action = isActive ? 'activada' : 'desactivada';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const table = await Table.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        );

        if (!table) {
            return res.status(404).json({ success: false, message: 'Mesa no encontrada' });
        }

        res.status(200).json({
            success: true,
            message: `Mesa ${action} exitosamente del inventario`,
            data: table
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado de la mesa',
            error: error.message
        });
    }
};