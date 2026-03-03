'use strict';

import { body, param } from 'express-validator';
import { checkValidators } from "./check-validators.js";

export const validateCreateReservation = [
    body('user')
        .notEmpty()
        .withMessage('El ID del usuario es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de usuario válido'),
    body('restaurant')
        .notEmpty()
        .withMessage('El ID del restaurante es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de restaurante válido'),
    body('type')
        .notEmpty()
        .withMessage('El tipo de reservación es obligatorio')
        .isIn(['En Mesa', 'Para llevar', 'A domicilio'])
        .withMessage('Tipo de reservación no válido'),
    body('date')
        .notEmpty()
        .withMessage('La fecha y hora son obligatorias')
        .isISO8601()
        .withMessage('Formato de fecha inválido (debe ser ISO8601)'),
    body('table')
        .if(body('type').equals('En Mesa'))
        .notEmpty()
        .withMessage('La mesa es obligatoria para reservaciones en el local')
        .isMongoId()
        .withMessage('No es un ID de mesa válido'),
    body('deliveryAddress')
        .if(body('type').equals('A domicilio'))
        .notEmpty()
        .withMessage('La dirección de entrega es obligatoria para pedidos a domicilio')
        .trim(),
    body('items')
        .optional()
        .isArray()
        .withMessage('Los ítems deben ser un arreglo'),
    body('items.*.menuItem')
        .if(body('items').exists())
        .isMongoId()
        .withMessage('ID de producto del menú no válido'),
    body('items.*.quantity')
        .if(body('items').exists())
        .isInt({ min: 1 })
        .withMessage('La cantidad mínima por producto es 1'),
    body('status')
        .optional()
        .isIn(['Pendiente', 'Confirmada', 'En curso', 'Completada', 'Cancelada'])
        .withMessage('Estado de reservación no válido'),
    checkValidators
];

export const validateUpdateReservation = [
    param('id')
        .notEmpty()
        .withMessage('El ID de la reservación es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Formato de fecha inválido'),
    body('status')
        .optional()
        .isIn(['Pendiente', 'Confirmada', 'En curso', 'Completada', 'Cancelada'])
        .withMessage('Estado no válido'),
    body('type')
        .optional()
        .isIn(['En Mesa', 'Para llevar', 'A domicilio'])
        .withMessage('Tipo no válido'),
    checkValidators
];

export const validateGetReservationById = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    checkValidators
];

export const validateReservationStatusChange = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    checkValidators
];