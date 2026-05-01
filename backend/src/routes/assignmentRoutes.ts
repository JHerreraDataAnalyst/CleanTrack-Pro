import { Router } from 'express';
import { validateClosure, closeAssignment } from '../controllers/assignmentController';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Rutas protegidas para los trabajadores sobre sus asignaciones
router.use(authenticate);

// GET /api/worker/assignments/:id/validate-closure
router.get('/:id/validate-closure', validateClosure);

// POST /api/worker/assignments/:id/close
router.post('/:id/close', closeAssignment);

export default router;
