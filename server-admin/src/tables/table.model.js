'use strict';

import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: [true, 'La mesa debe estar vinculada a un restaurante']
    },
    number: {
        type: String,
        required: [true, 'El número o identificador de la mesa es obligatorio'],
        trim: true
    },
    capacity: {
        type: Number,
        required: [true, 'La capacidad de personas es obligatoria'],
        min: [1, 'La capacidad mínima debe ser de 1 persona']
    },
    location: {
        type: String,
        required: [true, 'La ubicación de la mesa es obligatoria'],
        enum: ['Terraza', 'Sala Principal', 'VIP', 'Bar', 'Ventana', 'Balcón', 'Otro'],
        message: '{ENUM} no es una ubicación válida'
    },
    status: {
        type: String,
        enum: ['Disponible', 'Ocupada', 'Reservada', 'Mantenimiento'],
        default: 'Disponible'
    },
    availabilitySchedules: [{
        day: {
            type: String,
            enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
            required: true
        },
        startTime: {
            type: String, 
            required: true
        },
        endTime: {
            type: String, 
            required: true
        }
    }],
    description: {
        type: String,
        trim: true,
        maxLength: [200, 'La descripción no puede exceder los 200 caracteres']
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

export default mongoose.model('Table', tableSchema);