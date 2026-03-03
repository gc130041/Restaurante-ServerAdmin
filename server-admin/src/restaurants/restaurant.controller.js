'use strict';

import mongoose from 'mongoose';
import Restaurant from './restaurant.model.js';

export const getRestaurants = async (req, res) => {
    try {
        const { isActive } = req.query;

        const filter = {};
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }

        const restaurants = await Restaurant.find(filter)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            total: restaurants.length,
            data: restaurants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener los restaurantes',
            error: error.message
        });
    }
};

export const getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'ID de MongoDB no válido'
            });
        }

        const restaurant = await Restaurant.findById(id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener el restaurante',
            error: error.message
        });
    }
};

export const createRestaurant = async (req, res) => {
    try {
        const restaurantData = req.body;

        if (req.file) {
            const extension = req.file.path.split('.').pop();
            const fileName = req.file.filename;

            const relativePath = fileName.substring(
                fileName.indexOf('photos/')
            );

            restaurantData.photos = [`${relativePath}.${extension}`];
        } else {
            restaurantData.photos = ['photos/default_photos_logo'];
        }

        const restaurant = new Restaurant(restaurantData);
        await restaurant.save();

        res.status(201).json({
            succes: true, 
            message: 'Restaurante creado exitosamente',
            data: restaurant
        });

    } catch (error) {
        res.status(500).json({
            succes: false,
            message: 'Error al crear el restaurante',
            error: error.message
        });
    }
};

export const updateRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        if (req.file) {
            const extension = req.file.path.split('.').pop();
            const fileName = req.file.filename;
            const relativePath = fileName.substring(fileName.indexOf('photos/'));
            updateData.photos = [`${relativePath}.${extension}`];
        }

        const restaurant = await Restaurant.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurante no encontrado'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Restaurante actualizado exitosamente',
            data: restaurant
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error al actualizar el restaurante',
            error: error.message
        });
    }
};

export const changeRestaurantStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = req.url.includes('/activate');
        const action = isActive ? 'activado' : 'desactivado';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const restaurant = await Restaurant.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        );

        if (!restaurant) {
            return res.status(404).json({ success: false, message: 'Restaurante no encontrado' });
        }

        res.status(200).json({
            success: true,
            message: `Restaurante ${action} exitosamente`,
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado',
            error: error.message
        });
    }
};