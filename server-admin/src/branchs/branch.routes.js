'use strict';

import { Router } from "express";
import {
    changeBranchStatus,
    createBranch,
    getBranchById,
    getBranches,
    updateBranch
} from "./branch.controller.js";
import {
    validateCreateBranch,
    validateGetBranchById,
    validateBranchStatusChange,
    validateUpdateBranch
} from "../../middlewares/branches-validators.js";
import { validateJWT, authorizeRole } from '../../middlewares/auth.middleware.js';
import { injectTenantContext } from '../../middlewares/tenant.middleware.js';
import { verifyResourceOwnership } from '../../middlewares/tenant-ownership.js';
import { uploadBranchImage } from "../../middlewares/file-uploader.js";
import Branch from "./branch.model.js";

const router = Router();
const auth = [validateJWT, injectTenantContext];

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Gestión de sucursales con aislamiento de Tenant
 */

router.get('/', 
    ...auth, 
    authorizeRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'BRANCH_MANAGER'), 
    getBranches
);

router.get('/:id', 
    ...auth, 
    validateGetBranchById, 
    verifyResourceOwnership(Branch), 
    getBranchById
);

router.post('/', 
    ...auth, 
    authorizeRole('SUPER_ADMIN', 'COMPANY_ADMIN'), 
    uploadBranchImage.single('photos'), 
    validateCreateBranch, 
    createBranch
);

router.put('/:id', 
    ...auth, 
    authorizeRole('SUPER_ADMIN', 'COMPANY_ADMIN'), 
    uploadBranchImage.single('photos'), 
    verifyResourceOwnership(Branch), 
    validateUpdateBranch, 
    updateBranch
);

router.put('/:id/activate', 
    ...auth, 
    authorizeRole('SUPER_ADMIN', 'COMPANY_ADMIN'), 
    verifyResourceOwnership(Branch), 
    validateBranchStatusChange, 
    changeBranchStatus
);

router.put('/:id/desactivate', 
    ...auth, 
    authorizeRole('SUPER_ADMIN', 'COMPANY_ADMIN'), 
    verifyResourceOwnership(Branch), 
    validateBranchStatusChange, 
    changeBranchStatus
);

export default router;