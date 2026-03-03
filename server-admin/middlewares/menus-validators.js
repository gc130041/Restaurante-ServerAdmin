'use strict';

import { body, param } from 'express-validator';
import { checkValidators } from "./check-validators.js";

export const validateCreateMenu = [
    body('restaurant')
        .notEmpty()
        .withMessage('El ID del restaurante es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de restaurante válido'),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('El nombre del plato es obligatorio')
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('La descripción es obligatoria')
        .isLength({ min: 10, max: 500 })
        .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('ingredients')
        .notEmpty()
        .withMessage('Los ingredientes son obligatorios'),
    body('price')
        .notEmpty()
        .withMessage('El precio es obligatorio')
        .isFloat({ min: 0 })
        .withMessage('El precio no puede ser negativo'),
    body('category')
        .notEmpty()
        .withMessage('La categoría es obligatoria')
        .isIn(['Entrada', 'Plato Fuerte', 'Postre', 'Bebida', 'Acompañamiento', 'Otro'])
        .withMessage('No es una categoría de menú válida'),
    checkValidators
];

export const validateUpdateMenu = [
    param('id')
        .notEmpty()
        .withMessage('El ID del plato es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    body('name')
        .optional()
        .isLength({ min: 3, max: 100 })
        .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('description')
        .optional()
        .isLength({ min: 10, max: 500 })
        .withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('ingredients')
        .optional(),
    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El precio no puede ser negativo'),
    body('category')
        .optional()
        .isIn(['Entrada', 'Plato Fuerte', 'Postre', 'Bebida', 'Acompañamiento', 'Otro'])
        .withMessage('Categoría no válida'),
    checkValidators
];

export const validateGetMenuById = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    checkValidators
];

export const validateMenuStatusChange = [
    param('id')
        .notEmpty()
        .withMessage('El ID es obligatorio')
        .isMongoId()
        .withMessage('No es un ID de MongoDB válido'),
    checkValidators
];