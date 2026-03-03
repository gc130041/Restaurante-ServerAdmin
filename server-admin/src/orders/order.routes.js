import { Router } from "express";
import { createOrder, updateItemStatus, updateOrderStatus } from "./order.controller.js";
import { createOrderValidator, updateItemStatusValidator, updateOrderStatusValidator } from "../../middlewares/orders-validators.js";

const router = Router();

/**
 * @route POST /api/v1/orders
 * @desc Crea una nueva comanda vinculada a una mesa y un mesero
 */
router.post("/", createOrderValidator, createOrder);

/**
 * @route PATCH /api/v1/orders/:orderId/item/:itemId/status
 * @desc Actualiza el estado de un platillo individual (ej. EN_COCINA -> LISTO)
 */
router.patch("/:orderId/item/:itemId/status", updateItemStatusValidator, updateItemStatus);

/**
 * @route PATCH /api/v1/orders/:id/status
 * @desc Actualiza el estado general de la orden (ej. ABIERTA -> CANCELADA)
 */
router.patch("/:id/status", updateOrderStatusValidator, updateOrderStatus);

export default router;