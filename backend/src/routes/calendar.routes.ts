import { Router } from 'express';
import { getAssignments } from '../controllers/calendar.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint para el calendario (protegido por middleware de autenticación JWT)
router.get('/assignments', requireAuth, getAssignments);

export default router;
