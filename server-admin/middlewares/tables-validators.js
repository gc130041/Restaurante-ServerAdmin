'use strict';

import { body, param } from 'express-validator';
import { checkValidators } from "./check-validators.js";

export const validateCreateTable = [
    body('restaurant')
        .notEmpty()
        .withMessage('El ID del restaurante es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de restaurante válido'),
    body('number')
        .notEmpty()
        .withMessage('El número o identificador de la mesa es obligatorio')
        .trim(),
    body('capacity')
        .notEmpty()
        .withMessage('La capacidad es obligatoria')
        .isInt({ min: 1 })
        .withMessage('La capacidad debe ser un número entero mayor a 0'),
    body('location')
        .notEmpty()
        .withMessage('La ubicación es obligatoria')
        .isIn(['Terraza', 'Sala Principal', 'VIP', 'Bar', 'Ventana', 'Balcón', 'Otro'])
        .withMessage('Ubicación no válida'),
    body('status')
        .optional()
        .isIn(['Disponible', 'Ocupada', 'Reservada', 'Mantenimiento'])
        .withMessage('Estado de mesa no válido'),
    body('availabilitySchedules')
        .optional()
        .isArray()
        .withMessage('Los horarios deben ser un arreglo'),
    body('availabilitySchedules.*.day')
        .if(body('availabilitySchedules').exists())
        .notEmpty()
        .isIn(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'])
        .withMessage('Día no válido en el horario'),
    body('availabilitySchedules.*.startTime')
        .if(body('availabilitySchedules').exists())
        .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .withMessage('Formato de hora de inicio inválido (ej: 08:00)'),
    body('availabilitySchedules.*.endTime')
        .if(body('availabilitySchedules').exists())
        .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .withMessage('Formato de hora de fin inválido (ej: 22:00)'),
    checkValidators
];

export const validateUpdateTable = [
    param('id')
        .notEmpty()
        .withMessage('El ID de la mesa es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    body('number')
        .optional()
        .trim(),
    body('capacity')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La capacidad debe ser mayor a 0'),
    body('location')
        .optional()
        .isIn(['Terraza', 'Sala Principal', 'VIP', 'Bar', 'Ventana', 'Balcón', 'Otro'])
        .withMessage('Ubicación no válida'),
    body('status')
        .optional()
        .isIn(['Disponible', 'Ocupada', 'Reservada', 'Mantenimiento'])
        .withMessage('Estado no válido'),
    checkValidators
];

export const validateGetTableById = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    checkValidators
];

export const validateTableStatusChange = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    checkValidators
];