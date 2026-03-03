import { body } from "express-validator";
import { checkValidators  } from "./check-validators.js";
import { validateJWT } from "./validate-jwt.js";

export const createOrderValidator = [
    validateJWT,
    body("table", "El ID de la mesa es obligatorio y debe ser válido").isMongoId(),
    body("restaurant", "El ID del restaurante es obligatorio").isMongoId(),
    body("items", "Los items son obligatorios y deben ser un arreglo").isArray({ min: 1 }),
    body("items.*.menuItem", "El ID del platillo debe ser válido").isMongoId(),
    body("items.*.quantity", "La cantidad debe ser un número mayor a 0").isInt({ min: 1 }),
    body("items.*.price", "El precio del platillo es obligatorio").isNumeric(),
    body("items.*.modifiers", "Los modificadores deben ser un arreglo").optional().isArray(),
    checkValidators 
];

export const updateItemStatusValidator = [
    validateJWT,
    body("status", "El estado es obligatorio").notEmpty(),
    body("status", "Estado no válido").isIn(["EN_ESPERA", "EN_COCINA", "LISTO", "SERVIDO"]),
    checkValidators 
];

export const updateOrderStatusValidator = [
    validateJWT,
    body("status", "El estado es obligatorio").notEmpty(),
    body("status", "Estado no válido").isIn(["ABIERTA", "CERRADA", "CANCELADA"]),
    checkValidators 
];