'use strict';

import { Router } from "express";
import { 
    changeMenuStatus, 
    createMenu, 
    getMenuById, 
    getMenus, 
    updateMenu 
} from "./menu.controller.js";
import {
    validateCreateMenu,
    validateGetMenuById,
    validateMenuStatusChange,
    validateUpdateMenu
} from "../../middlewares/menus-validators.js";
import { validateJWT, authorizeRole } from '../../middlewares/auth.middleware.js';
import { injectTenantContext } from '../../middlewares/tenant.middleware.js';
import { verifyResourceOwnership } from '../../middlewares/tenant-ownership.js';
import { uploadMenuImage } from "../../middlewares/file-uploader.js";
import Menu from "./menu.model.js";

const router = Router();
const auth = [validateJWT, injectTenantContext];

const parseMenuJsonFields = (req, res, next) => {
    try {
        if (req.body.recipe && typeof req.body.recipe === 'string') {
            req.body.recipe = JSON.parse(req.body.recipe);
        }
        if (req.body.comboItems && typeof req.body.comboItems === 'string') {
            req.body.comboItems = JSON.parse(req.body.comboItems);
        }
        if (req.body.promotion && typeof req.body.promotion === 'string') {
            req.body.promotion = JSON.parse(req.body.promotion);
        }

        // Map frontend recipe format (ingredientId) to BOM Schema (componentId, componentType: 'Ingredient')
        if (Array.isArray(req.body.recipe)) {
            req.body.recipe = req.body.recipe.map(r => {
                if (r.ingredientId) {
                    return {
                        componentId: r.ingredientId,
                        componentType: 'Ingredient',
                        quantityRequired: Number(r.quantityRequired || 0)
                    };
                }
                return r;
            });
        }

        // Map frontend comboItems format (menuItemId) to BOM Schema (componentId, componentType: 'Menu')
        if (Array.isArray(req.body.comboItems)) {
            req.body.recipe = req.body.comboItems.map(c => ({
                componentId: c.menuItemId,
                componentType: 'Menu',
                quantityRequired: Number(c.quantity || 1)
            }));
            delete req.body.comboItems;
        }

        next();
    } catch (err) {
        return res.status(400).json({
            success: false,
            message: 'Error al procesar campos JSON',
            error: [{ field: 'recipe', message: 'Formato JSON inválido' }]
        });
    }
};

/**
 * @swagger
 * tags:
 *   name: Menus
 *   description: Gestión de carta/menú con aislamiento de Tenant
 */

router.get('/', 
    ...auth, 
    authorizeRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER', 'WAITER'), 
    getMenus
);

router.get('/:id', 
    ...auth, 
    validateGetMenuById, 
    verifyResourceOwnership(Menu), 
    getMenuById
);

router.post('/', 
    ...auth, 
    authorizeRole('COMPANY_ADMIN', 'BRANCH_MANAGER'), 
    uploadMenuImage.single('image'), 
    parseMenuJsonFields,
    validateCreateMenu, 
    createMenu
);

router.put('/:id', 
    ...auth, 
    authorizeRole('COMPANY_ADMIN', 'BRANCH_MANAGER'), 
    uploadMenuImage.single('image'), 
    parseMenuJsonFields,
    verifyResourceOwnership(Menu), 
    validateUpdateMenu, 
    updateMenu
);

router.put('/:id/activate', 
    ...auth, 
    authorizeRole('COMPANY_ADMIN', 'BRANCH_MANAGER'), 
    verifyResourceOwnership(Menu), 
    validateMenuStatusChange, 
    changeMenuStatus
);

router.put('/:id/desactivate', 
    ...auth, 
    authorizeRole('COMPANY_ADMIN', 'BRANCH_MANAGER'), 
    verifyResourceOwnership(Menu), 
    validateMenuStatusChange, 
    changeMenuStatus
);

export default router;