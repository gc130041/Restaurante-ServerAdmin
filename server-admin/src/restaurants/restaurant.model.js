'use strict';

import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre del restaurante es obligatorio'],
        trim: true,
        unique: true,
        maxLength: [100, 'El nombre no puede exceder los 100 caracteres'],
        minLength: [3, 'El nombre debe tener al menos 3 caracteres']
    },
    descripcion: {
        type: String,
        required: [true, 'La descripción es obligatoria'],
        trim: true,
        maxLength: [500, 'La descripción no puede exceder los 500 caracteres'],
        minLength: [10, 'La descripción debe tener al menos 10 caracteres']
    },
    address: {
        type: String,
        required: [true, 'La dirección es obligatoria'],
        trim: true
    },
    openingTime: {
        type: String, 
        required: [true, 'La hora de apertura es obligatoria'],
        match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Formato de hora valido (ej: 08:00)']
    },
    closingTime: {
        type: String, 
        required: [true, 'La hora de cierre es obligatoria'],
        match: [/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Formato de hora valido (ej: 10:00)']
    },
    category: {
        type: String,
        required: [true, 'La categoría gastronómica es obligatoria'],
        enum: ['Italiana', 'Mexicana', 'Japonesa', 'Casera', 'Comida Rápida', 'Vegetariana', 'Mariscos', 'China', 'Otros'],
        message: '{ENUM} no es una categoría válida'
    },
    averagePrice: {
        type: Number,
        required: [true, 'El precio promedio es obligatorio'],
        min: [0, 'El precio no puede ser negativo']
    },
    photos: {
        type: [String],
        trim: true,
        default: ['photos/default_photos_logo']
    },
    email: {
        type: String,
        required: [true, 'El correo de contacto es obligatorio'],
        unique: true,
        trim: true,
        match: [/.+\@.+\..+/, 'Por favor ingrese un correo electrónico válido']
    },
    phoneNumber: {
        type: String,
        required: [true, 'El número de teléfono es obligatorio'],
        unique: true,
        trim: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Por favor ingrese un número de teléfono válido']
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

export default mongoose.model('Restaurant', restaurantSchema);