'use strict';

import { body, param } from 'express-validator';
import { checkValidators } from "./check-validators.js";

export const validateCreateRestaurant = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre del restaurante es obligatorio')
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('descripcion')
        .trim()
        .notEmpty()
        .withMessage('La descripción es obligatoria')
        .isLength({ min: 10, max: 500 })
        .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('address')
        .trim()
        .notEmpty()
        .withMessage('La dirección es obligatoria'),
    body('openingTime')
        .notEmpty()
        .withMessage('La hora de apertura es obligatoria')
        .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .withMessage('Formato de hora de apertura inválido (ej: 08:00)'),
    body('closingTime')
        .notEmpty()
        .withMessage('La hora de cierre es obligatoria')
        .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .withMessage('Formato de hora de cierre inválido (ej: 22:00)'),
    body('category')
        .notEmpty()
        .withMessage('La categoría es obligatoria')
        .isIn(['Italiana', 'Mexicana', 'Japonesa', 'Casera', 'Comida Rápida', 'Vegetariana', 'Mariscos', 'China', 'Otros'])
        .withMessage('No es una categoría gastronómica válida'),
    body('averagePrice')
        .notEmpty()
        .withMessage('El precio promedio es obligatorio')
        .isFloat({ min: 0 })
        .withMessage('El precio promedio no puede ser negativo'),
    body('email')
        .trim()
        .notEmpty()
        .withMessage('El correo electrónico es obligatorio')
        .isEmail()
        .normalizeEmail()
        .withMessage('Por favor ingrese un correo electrónico válido'),
    body('phoneNumber')
        .trim()
        .notEmpty()
        .withMessage('El número de teléfono es obligatorio')
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Por favor ingrese un número de teléfono válido'),
    checkValidators
];

export const validateGetRestaurantById = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    checkValidators
];

export const validateUpdateRestaurant = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    body('name')
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('descripcion')
        .optional() 
        .isLength({ min: 10, max: 500 })
        .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('address')
        .optional() 
        .trim(),
    body('openingTime')
        .optional() 
        .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .withMessage('Formato de hora de apertura inválido (ej: 08:00)'),
    body('closingTime')
        .optional() 
        .matches(/^([01]\d|2[0-3]):?([0-5]\d)$/)
        .withMessage('Formato de hora de cierre inválido (ej: 22:00)'),
    body('category')
        .optional()
        .isIn(['Italiana', 'Mexicana', 'Japonesa', 'Casera', 'Comida Rápida', 'Vegetariana', 'Mariscos', 'China', 'Otros'])
        .withMessage('No es una categoría válida'),
    body('averagePrice')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio promedio no puede ser negativo'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Por favor ingrese un correo electrónico válido'),
    body('phoneNumber')
        .optional()
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Por favor ingrese un número de teléfono válido'),
    checkValidators
];

export const validateRestaurantStatusChange = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('Debe ser un ID de MongoDB válido'),
    checkValidators
];