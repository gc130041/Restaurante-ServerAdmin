'use strict';

import mongoose from 'mongoose';
import Branch from './branch.model.js';

/**
 * @swagger
 * components:
 *   schemas:
 *     Branch:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         address:
 *           type: string
 *         isActive:
 *           type: boolean
 */

/**
 * Listar sucursales filtradas por el contexto del tenant.
 */
export const getBranches = async (req, res, next) => {
    try {
        // req.tenantFilter es inyectado por injectTenantContext
        const branches = await Branch.find({ ...req.tenantFilter, isActive: true })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: branches.length,
            data: branches
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Obtener detalle de sucursal.
 */
export const getBranchById = async (req, res, next) => {
    try {
        // req.resource es inyectado por verifyResourceOwnership
        const branch = req.resource || await Branch.findOne({ _id: req.params.id, ...req.tenantFilter });
        
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Sucursal no encontrada' });
        }

        res.status(200).json({ success: true, data: branch });
    } catch (error) {
        next(error);
    }
};

/**
 * Crear nueva sucursal vinculada al tenant actual.
 */
export const createBranch = async (req, res, next) => {
    try {
        const branchData = { 
            ...req.body, 
            companyId: req.companyId || req.body.companyId // Inyectar ID si existe en contexto, sino del body
        };

        if (req.file) {
            branchData.photos = [req.file.path]; // Cloudinary URL
        }

        const branch = new Branch(branchData);
        await branch.save();

        res.status(201).json({
            success: true,
            message: 'Sucursal creada exitosamente',
            data: branch
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualizar sucursal.
 */
export const updateBranch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        if (req.file) {
            updateData.photos = [req.file.path];
        } else if (req.body.removePhoto === "true") {
            updateData.photos = ['photos/default_photos_logo'];
        }

        const branch = await Branch.findByIdAndUpdate(id, updateData, {
            returnDocument: 'after',
            runValidators: true
        });

        res.status(200).json({
            success: true,
            message: 'Sucursal actualizada exitosamente',
            data: branch
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cambiar estado (Activar/Desactivar) - Soft Delete.
 */
export const changeBranchStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const isActive = req.url.includes('/activate');
        
        const branch = await Branch.findByIdAndUpdate(id, { isActive }, { returnDocument: 'after' });

        res.status(200).json({
            success: true,
            message: `Sucursal ${isActive ? 'activada' : 'desactivada'} exitosamente`,
            data: branch
        });
    } catch (error) {
        next(error);
    }
};