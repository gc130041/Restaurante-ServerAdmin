import { Router } from 'express';
import { getUsers, getProfile, syncProfile } from './user.controller.js'; // <-- Importa syncProfile
import { validateJWT } from '../../middlewares/validate-jwt.js';

const router = Router();

router.post('/sync', syncProfile);

// Rutas protegidas
router.get('/', validateJWT, getUsers);
router.get('/profile', validateJWT, getProfile);

export default router;