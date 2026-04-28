import { Router } from 'express';
import { logHours, verifyWorkRecord } from '../controllers/workRecordController';

const router = Router();

// Endpoint para cargar horas (Trabajador)
router.post('/', logHours);

// Endpoint para confirmar/verificar registro (Trabajador o Admin)
router.patch('/:id/verify', verifyWorkRecord);

export default router;
