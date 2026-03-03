'use strict';

import mongoose from 'mongoose';
import Reservation from './reservation.model.js';

export const getReservations = async (req, res) => {
    try {
        const { restaurant, user, status, type } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;
        if (restaurant) filter.restaurant = restaurant;
        if (user) filter.user = user;

        const reservations = await Reservation.find(filter)
            .populate('restaurant', 'name')
            .populate('user', 'name email')
            .populate('table', 'number')
            .sort({ date: 1 });

        res.status(200).json({
            success: true,
            total: reservations.length,
            data: reservations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener las reservaciones',
            error: error.message
        });
    }
};

export const getReservationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const reservation = await Reservation.findById(id)
            .populate('restaurant', 'name')
            .populate('user', 'name')
            .populate('table', 'number');

        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservación no encontrada' });
        }

        res.status(200).json({ success: true, data: reservation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const createReservation = async (req, res) => {
    try {
        const reservationData = req.body;

        const reservation = new Reservation(reservationData);
        await reservation.save();

        res.status(201).json({
            success: true,
            message: 'Reservación creada exitosamente',
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al crear la reservación',
            error: error.message
        });
    }
};

export const updateReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const reservation = await Reservation.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true
        });

        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservación no encontrada' });
        }

        res.status(200).json({
            success: true,
            message: 'Reservación actualizada correctamente',
            data: reservation
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error al actualizar la reservación',
            error: error.message
        });
    }
};

export const changeReservationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = req.url.includes('/activate');
        const action = isActive ? 'activada' : 'desactivada';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'ID no válido' });
        }

        const reservation = await Reservation.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        );

        if (!reservation) {
            return res.status(404).json({ success: false, message: 'Reservación no encontrada' });
        }

        res.status(200).json({
            success: true,
            message: `Reservación ${action} exitosamente`,
            data: reservation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al cambiar el estado de la reservación',
            error: error.message
        });
    }
};