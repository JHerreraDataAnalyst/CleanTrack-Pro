import { Router } from 'express';
import { logHours, verifyWorkRecord, getWorkRecords, getDashboardData, getMyHistory } from '../controllers/workRecordController';

const router = Router();

// Endpoint para el historial del trabajador
router.get('/my-history', getMyHistory);

// Endpoint para el dashboard de admin
router.get('/dashboard', getDashboardData);

// Endpoint para obtener asignaciones/registros (Trabajador)
router.get('/', getWorkRecords);

// Endpoint para cargar horas (Trabajador)
router.post('/', logHours);

// Endpoint para confirmar/verificar registro (Trabajador o Admin)
router.patch('/:id/verify', verifyWorkRecord);

export default router;
