import { Router } from 'express';
import { logHours, verifyWorkRecord, getWorkRecords } from '../controllers/workRecordController';

const router = Router();

// Endpoint para obtener asignaciones/registros (Trabajador)
router.get('/', getWorkRecords);

// Endpoint para cargar horas (Trabajador)
router.post('/', logHours);

// Endpoint para confirmar/verificar registro (Trabajador o Admin)
router.patch('/:id/verify', verifyWorkRecord);

export default router;
