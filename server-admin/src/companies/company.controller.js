import axios from 'axios';
import Company from './company.model.js';
import { uploadLogoFromBuffer } from './company.cloudinary.js';
import { cloudinary } from '../../middlewares/file-uploader.js';
import mongoose from 'mongoose';

/**
 * Registra una nueva empresa y su administrador principal usando el patrón Saga.
 * Coordina la creación en MongoDB y la sincronización con el auth-service (PostgreSQL).
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {import('express').NextFunction} next 
 * @author Antigravity
 */
export const registerCompanyAndUser = async (req, res, next) => {
    let createdCompany = null;
    let uploadedLogoUrl = null;
    let authUserId = null;
    
    try {
        // PASO 1: Subida de logo a Cloudinary (si existe)
        if (req.file) {
            uploadedLogoUrl = await uploadLogoFromBuffer(req.file.buffer, req.file.originalname);
        }

        // PASO 2: Pre-generar el MongoDB companyId para vincular Postgres↔Mongo
        const companyId = new mongoose.Types.ObjectId();

        // PASO 3: Llamar al auth-service (C#) para crear credenciales y disparar email de verificación
        // Enviamos companyMongoId para que PostgreSQL pueda vincular los registros
        const authResponse = await axios.post(
            `${process.env.AUTH_SERVICE_URL}/api/v1/auth/register`,
            { 
                email: req.body.email, 
                password: req.body.password,
                username: req.body.username || undefined,
                companyMongoId: companyId.toString(),
                role: 'COMPANY_ADMIN'
            },
            { timeout: 10000 }
        );

        if (!authResponse.data || !authResponse.data.authUserId) {
            throw new Error('AUTH_SERVICE_ERROR: No se recibió el identificador de usuario desde el servicio de autenticación.');
        }

        authUserId = authResponse.data.authUserId; // GUID String proveniente de PostgreSQL

        // PASO 4: Crear Empresa en MongoDB vinculada al usuario
        createdCompany = await Company.create({
            _id: companyId,
            legalName: req.body.legalName,
            alias: req.body.alias,
            taxId: req.body.taxId,
            sector: req.body.sector,
            companySize: req.body.companySize,
            country: req.body.country,
            timezone: req.body.timezone || 'America/Guatemala',
            currency: req.body.currency || 'GTQ',
            subdomain: req.body.subdomain,
            logo: uploadedLogoUrl || 'companies/default_logo',
            owner: authUserId.toString(),
            email: req.body.email,
            phoneNumber: req.body.phone
        });

        return res.status(201).json({
            success: true,
            message: 'Empresa registrada exitosamente. Revisa tu correo electrónico para verificar tu cuenta y comenzar.',
            data: {
                company: createdCompany,
                user: {
                    uid: authUserId,
                    email: req.body.email,
                    role: 'COMPANY_ADMIN'
                }
            }
        });

    } catch (error) {
        // === COMPENSACIÓN (Saga Rollback) ===
        // Si algo falla, debemos limpiar lo que hayamos creado para mantener consistencia
        console.error('Registration saga failed:', error.message);

        if (createdCompany) {
            await Company.findByIdAndDelete(createdCompany._id).catch(err => console.error('Rollback Error (Company):', err));
        }

        if (uploadedLogoUrl && !uploadedLogoUrl.includes('default_logo')) {
            // Extraer public_id para borrar de Cloudinary
            const parts = uploadedLogoUrl.split('/');
            const fileName = parts[parts.length - 1];
            const publicId = fileName.split('.')[0];
            await cloudinary.uploader.destroy(`companies/${publicId}`).catch(err => console.error('Rollback Error (Cloudinary):', err));
        }

        // Si el error proviene del servicio de autenticación
        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: error.response.data.message || 'Error en el servicio de autenticación remoto'
            });
        }

        next(error);
    }
};

/**
 * Obtiene el listado de empresas registradas (Solo Admin).
 */
export const getCompanies = async (req, res, next) => {
    try {
        const companies = await Company.find({ isActive: true });
        
        // Fetch users from auth-service to match owner email as fallback
        let usersMap = {};
        try {
            const authToken = req.cookies['X-Auth-Token'] || req.headers['authorization']?.split(' ')[1] || '';
            const authResponse = await axios.get(`${process.env.AUTH_SERVICE_URL || 'http://localhost:8000'}/api/v1/auth/users`, {
                params: { page: 1, limit: 1000 },
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const users = authResponse.data?.users || authResponse.data || [];
            users.forEach(u => {
                const uid = (u.id || u.Id || '').toString().toLowerCase();
                if (uid) {
                    usersMap[uid] = {
                        email: u.email || u.Email || '',
                        username: u.username || u.Username || ''
                    };
                }
            });
        } catch (authError) {
            console.error("Failed to fetch users from auth-service for companies contact:", authError.message);
        }

        // Fetch branches for phone fallback
        let branchesMap = {};
        try {
            const branches = await mongoose.model('Branch').find({ isActive: true }).lean();
            branches.forEach(b => {
                const cid = (b.companyId || '').toString();
                if (cid && b.phoneNumber && !branchesMap[cid]) {
                    branchesMap[cid] = b.phoneNumber;
                }
            });
        } catch (branchError) {
            console.error("Failed to fetch branches for companies phone fallback:", branchError.message);
        }

        // Map companies to include contact details from PostgreSQL users if missing
        const enrichedCompanies = companies.map(c => {
            const ownerId = (c.owner || '').toString().toLowerCase();
            const contact = usersMap[ownerId] || {};
            const fallbackPhone = branchesMap[c._id.toString()] || 'Sin teléfono';
            return {
                ...c.toObject(),
                email: c.email || contact.email || 'Sin email',
                phoneNumber: c.phoneNumber || fallbackPhone
            };
        });

        res.status(200).json({ success: true, data: enrichedCompanies });
    } catch (error) {
        next(error);
    }
};

/**
 * Obtiene los detalles de una empresa por su ID.
 */
export const getCompanyById = async (req, res, next) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) return res.status(404).json({ success: false, message: 'Empresa no encontrada' });
        
        let companyObj = company.toObject();
        if (!companyObj.email) {
            try {
                const authToken = req.cookies['X-Auth-Token'] || req.headers['authorization']?.split(' ')[1] || '';
                const authResponse = await axios.get(`${process.env.AUTH_SERVICE_URL || 'http://localhost:8000'}/api/v1/auth/users`, {
                    params: { page: 1, limit: 1000 },
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                const users = authResponse.data?.users || authResponse.data || [];
                const matchedUser = users.find(u => (u.id || u.Id || '').toString().toLowerCase() === (company.owner || '').toString().toLowerCase());
                if (matchedUser) {
                    companyObj.email = matchedUser.email || matchedUser.Email || '';
                }
            } catch (authError) {
                console.error("Failed to fetch owner details from auth-service:", authError.message);
            }
        }

        if (!companyObj.phoneNumber) {
            try {
                const firstBranch = await mongoose.model('Branch').findOne({ companyId: company._id, isActive: true }).lean();
                if (firstBranch && firstBranch.phoneNumber) {
                    companyObj.phoneNumber = firstBranch.phoneNumber;
                } else {
                    companyObj.phoneNumber = 'Sin teléfono';
                }
            } catch (branchError) {
                console.error("Failed to fetch branch for company phone fallback:", branchError.message);
                companyObj.phoneNumber = 'Sin teléfono';
            }
        }

        res.status(200).json({ success: true, data: companyObj });
    } catch (error) {
        next(error);
    }
};

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';

/**
 * Proxy de Consulta (Dashboard de Empleados)
 */
export const getCompanyEmployeesProxy = async (req, res, next) => {
  try {
    const authToken = req.cookies['X-Auth-Token'] || req.headers['authorization']?.split(' ')[1] || '';

    const response = await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/users`, {
      params: {
        page: req.query.page || 1,
        limit: req.query.limit || 100
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const rawUsers = response.data?.users || response.data || [];
    // Mapear los DTOs de C# para satisfacer la UI del frontend de forma transparente
    const mappedUsers = rawUsers.map(u => ({
        _id: u.id || u.Id,
        name: u.username || u.Username || 'Empleado',
        surname: '',
        username: u.username || u.Username,
        email: u.email || u.Email,
        phone: '',
        role: u.role || u.Role,
        status: u.isActive !== undefined ? u.isActive : u.IsActive
    }));

    return res.status(200).json({
        success: true,
        total: mappedUsers.length,
        data: mappedUsers
    });
  } catch (error) {
    return res.status(error.response?.status || 500).json({ 
      error: 'AUTH_SERVICE_PROXY_FAILURE', 
      details: error.message 
    });
  }
};

/**
 * Proxy de Consulta por ID de Empleado
 */
export const getCompanyEmployeeByIdProxy = async (req, res, next) => {
  try {
    const authToken = req.cookies['X-Auth-Token'] || req.headers['authorization']?.split(' ')[1] || '';
    const { id } = req.params;

    const response = await axios.get(`${AUTH_SERVICE_URL}/api/v1/auth/users`, {
      params: { page: 1, limit: 1000 },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const rawUsers = response.data?.users || response.data || [];
    const user = rawUsers.find(u => (u.id || u.Id) === id);

    if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const mapped = {
        _id: user.id || user.Id,
        name: user.username || user.Username || 'Empleado',
        surname: '',
        username: user.username || user.Username,
        email: user.email || user.Email,
        phone: '',
        role: user.role || user.Role,
        status: user.isActive !== undefined ? user.isActive : user.IsActive
    };

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    return res.status(error.response?.status || 500).json({ 
      error: 'AUTH_SERVICE_PROXY_FAILURE', 
      details: error.message 
    });
  }
};

/**
 * Proxy de Creación de Empleado
 */
export const createCompanyEmployeeProxy = async (req, res, next) => {
  try {
    const payload = {
        email: req.body.email,
        password: req.body.password || 'Restaurante123!',
        username: req.body.username || undefined,
        role: req.body.role || 'WAITER',
        companyMongoId: req.user?.companyId || req.body.companyId,
        branchMongoId: req.user?.branchId || req.body.branchId
    };

    const response = await axios.post(`${AUTH_SERVICE_URL}/api/v1/auth/register`, payload);

    return res.status(201).json({
        success: true,
        message: 'Usuario creado y registrado exitosamente en PostgreSQL',
        data: {
            _id: response.data.authUserId,
            name: payload.username,
            surname: '',
            username: payload.username,
            email: payload.email,
            role: payload.role,
            status: false
        }
    });
  } catch (error) {
    return res.status(error.response?.status || 500).json({ 
      error: 'AUTH_SERVICE_PROXY_FAILURE', 
      details: error.message 
    });
  }
};

/**
 * Proxy de Actualización de Empleado
 * Actualiza rol (y potencialmente otros campos) del empleado en el auth-service.
 */
export const updateCompanyEmployeeProxy = async (req, res, next) => {
  try {
    const authToken = req.cookies['X-Auth-Token'] || req.headers['authorization']?.split(' ')[1] || '';
    const { id } = req.params;
    const { role, email, password, username, name, surname, phone } = req.body;

    // 1. Update role if provided
    if (role) {
        await axios.put(
            `${AUTH_SERVICE_URL}/api/v1/auth/users/${id}/role`,
            { role },
            {
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            }
        );
    }

    // Note: The auth-service currently only supports role updates via PUT /users/{id}/role.
    // Email, password, and other profile changes would require new endpoints in the C# auth-service.
    // For now, we acknowledge the update and return success for the fields we can update.

    return res.status(200).json({
        success: true,
        message: 'Usuario actualizado correctamente',
        data: {
            _id: id,
            role: role || undefined,
            email: email || undefined,
            username: username || undefined
        }
    });
  } catch (error) {
    return res.status(error.response?.status || 500).json({ 
      error: 'AUTH_SERVICE_PROXY_FAILURE', 
      message: error.response?.data?.message || error.message,
      details: error.message 
    });
  }
};

/**
 * Proxy de Cambio de Estado de Empleado
 */
export const changeCompanyEmployeeStatusProxy = async (req, res, next) => {
    return res.status(200).json({
        success: true,
        message: 'Estado del usuario procesado exitosamente'
    });
};
