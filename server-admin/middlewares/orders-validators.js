import {body} from "express-validator";
import {checkValidators} from "./check-validators.js";

export const createOrderValidator = [
    body("tables", "Las mesas son obligatorias y deben ser un arreglo").isArray({min: 1}),
    body("tables.*", "El ID de la mesa debe ser válido").isMongoId(),
    body("branch", "El ID de la sucursal debe ser válido").optional().isMongoId(),
    body("items", "Los items son obligatorios y deben ser un arreglo").isArray({min: 1}),
    body("items.*.menuItem", "El ID del platillo debe ser válido").isMongoId(),
    body("items.*.quantity", "La cantidad debe ser un número mayor a 0").isInt({min: 1}),
    body("items.*.modifiers", "Los modificadores deben ser un arreglo").optional().isArray(),
    checkValidators
];

export const updateItemStatusValidator = [
    body("status", "El estado es obligatorio").notEmpty(),
    body("status", "Estado no válido").isIn(["pending", "in-kitchen", "ready", "delivered", "paid", "cancelled"]),
    checkValidators
];

export const updateOrderStatusValidator = [
    body("status", "El estado es obligatorio").notEmpty(),
    body("status", "Estado no válido").isIn(["pending", "in-kitchen", "ready", "delivered", "paid", "cancelled"]),
    checkValidators
];