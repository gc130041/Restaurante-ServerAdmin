'use strict';

import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'El usuario que realiza la reserva es obligatorio']
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'El restaurante es obligatorio']
    },
    type: {
        type: String,
        required: [true, 'El tipo de reservación es obligatorio'],
        enum: ['En Mesa', 'Para llevar', 'A domicilio'],
        default: 'En Mesa'
    },
    table: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Table',
        required: function() { return this.type === 'En Mesa'; }
    },
    items: [{
        menuItem: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Menu'
        },
        quantity: {
            type: Number,
            min: [1, 'La cantidad mínima es 1']
        }
    }],
    date: {
        type: Date,
        required: [true, 'La fecha y hora de la reservación es obligatoria']
    },
    deliveryAddress: {
        type: String,
        trim: true,
        required: function() { return this.type === 'A domicilio'; }
    },
    status: {
        type: String,
        enum: ['Pendiente', 'Confirmada', 'En curso', 'Completada', 'Cancelada'],
        default: 'Pendiente'
    },
    totalPrice: {
        type: Number,
        default: 0
    },
    notes: {
        type: String,
        trim: true,
        maxLength: [300, 'Las notas no pueden exceder los 300 caracteres']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Reservation', reservationSchema);