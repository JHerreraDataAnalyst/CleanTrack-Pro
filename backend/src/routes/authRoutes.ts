import { Router } from 'express';
import { login } from '../controllers/authController';

const router = Router();

// Endpoint para inicio de sesión
router.post('/login', login);

export default router;
