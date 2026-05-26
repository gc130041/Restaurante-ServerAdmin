import jwt from 'jsonwebtoken';

/**
 * Middleware para validar el Token JWT y extraer el usuario desde las claims (PostgreSQL).
 */
export const validateJWT = async (req, res, next) => {
    try {
        const token = req.cookies['X-Auth-Token'] || req.headers['authorization']?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, message: 'Falta token de acceso' });
        }

        // El SECRETORPRIVATEKEY debe estar en el .env (es la misma llave que usa C#)
        const decoded = jwt.verify(token, process.env.SECRETORPRIVATEKEY);
        
        const email = decoded.email || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
        const role = decoded.role || decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        const userId = decoded.sub || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        const companyMongoId = decoded.companyMongoId;
        const branchMongoId = decoded.branchMongoId;
        
        if (!email || !userId) {
            return res.status(401).json({ success: false, message: 'Token inválido: No se encontró el identificador del usuario' });
        }

        // Instanciamos req.user directamente a partir de las claims del JWT
        req.user = {
            _id: userId, // PostgreSQL GUID string
            email: email,
            role: role,
            companyId: companyMongoId, // Para compatibilidad multitenancy en Node.js
            branchId: branchMongoId,   // Para compatibilidad multitenancy en Node.js
            name: email.split('@')[0],
            surname: '',
            status: true
        };
        req.usuario = req.user; // Compatibilidad heredada

        next();
    } catch (error) {
        console.error("JWT Error: ", error.message);
        return res.status(401).json({ success: false, message: 'Token no válido o expirado' });
    }
};

/**
 * Middleware para autorizar el acceso basado en roles.
 */
export const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(500).json({ success: false, message: 'Se intentó verificar el rol sin validar el token' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Acceso denegado. Se requiere uno de los roles: ${allowedRoles.join(', ')}` 
            });
        }
        
        next();
    };
};

/**
 * Middleware para verificar la propiedad de los recursos (Multitenancy).
 */
export const checkOwnership = (resourceType) => {
    return (req, res, next) => {
        const { role, companyId, branchId } = req.user;

        // El SUPER_ADMIN tiene bypass total sobre cualquier recurso
        if (role === 'SUPER_ADMIN') return next();

        const requestedCompanyId = req.body?.companyId || req.params?.companyId || req.query?.companyId;
        const requestedBranchId = req.body?.branchId || req.params?.branchId || req.query?.branchId;

        // Validación para COMPANY_ADMIN: Solo puede ver/editar lo que pertenece a su compañía
        if (role === 'COMPANY_ADMIN') {
            if (requestedCompanyId && companyId?.toString() !== requestedCompanyId.toString()) {
                return res.status(403).json({ success: false, message: "No tienes permiso sobre esta empresa." });
            }
            return next();
        }

        // Validación para BRANCH_MANAGER y otros roles operativos: Solo pueden ver lo de su sucursal
        if (requestedBranchId && branchId?.toString() !== requestedBranchId.toString()) {
            return res.status(403).json({ success: false, message: "No tienes permiso sobre esta sucursal." });
        }

        // Si se pide una compañía específica y no es la suya, denegar
        if (requestedCompanyId && companyId?.toString() !== requestedCompanyId.toString()) {
            return res.status(403).json({ success: false, message: "No tienes permiso sobre esta empresa." });
        }

        next();
    };
};

/**
 * Middleware protector contra CSRF verificando la cabecera estándar de mutación controlada.
 */
export const antiCsrfGuard = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const customHeader = req.headers['x-requested-with'];
    if (!customHeader || customHeader !== 'XMLHttpRequest') {
      return res.status(403).json({ error: 'SECURITY_VIOLATION_CSRF_GUARD_TRIGGERED: Petición trans-origen bloqueada.' });
    }
  }
  next();
};
