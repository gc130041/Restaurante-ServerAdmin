import jwt from 'jsonwebtoken';
import User from '../src/users/user.model.js';

export const validateJWT = async (req, res, next) => {
    // Si usas Bearer token, puedes extraerlo así, o dejarlo como header 'x-token'
    const token = req.header('x-token') || req.header('Authorization')?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'No hay token en la petición' });
    }

    try {
        // La variable de entorno en tu .env DEBE ser idéntica a "Jwt:Key" de appsettings.json
        const decoded = jwt.verify(token, process.env.SECRETORPRIVATEKEY);

        // .NET almacena el email en claim estándar, pero a veces usa esquemas completos.
        // Capturamos ambas posibilidades:
        const userEmail = decoded.email || decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

        if (!userEmail) {
            return res.status(401).json({ success: false, message: 'Token no válido - Faltan claims de identidad' });
        }

        // Buscamos el perfil en MongoDB usando el correo
        const user = await User.findOne({ email: userEmail });

        if (!user || !user.status) {
            return res.status(401).json({ success: false, message: 'Token no válido - Perfil de usuario inactivo o no existe en DB' });
        }

        // Si existe, inyectamos el usuario en la request
        req.user = user;
        
        // Opcional: Inyectamos los datos directos de Postgres por si se necesitan
        req.postgresUserId = decoded.sub; 
        req.userRole = decoded.role;

        next();
    } catch (error) {
        console.log("Error de JWT:", error.message);
        res.status(401).json({ success: false, message: 'Token no válido o expirado' });
    }
};