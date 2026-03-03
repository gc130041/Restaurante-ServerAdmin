import User from './user.model.js';

export const getUsers = async (req, res) => {
    try {
        const { limit = 10, from = 0 } = req.query;
        const query = { status: true };

        const [total, users] = await Promise.all([
            User.countDocuments(query),
            User.find(query)
                .skip(Number(from))
                .limit(Number(limit))
        ]);

        res.status(200).json({ success: true, total, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
    }
};

export const getProfile = async (req, res) => {
    try {
        res.status(200).json({ success: true, user: req.user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener perfil' });
    }
};

export const syncProfile = async (req, res) => {
    try {
        const { email, role } = req.body;
        
        const user = new User({
            name: "Usuario",
            surname: "Nuevo",
            username: email.split('@')[0],
            email,
            phone: "00000000",
            role,
            status: true
        });

        await user.save();

        res.status(201).json({ success: true, user });
    } catch (error) {
        console.error("Error al sincronizar perfil:", error);
        res.status(500).json({ success: false, message: 'Error al sincronizar perfil en Mongo' });
    }
};