import { Router } from 'express';
import { createIssue, getIssuesByWorkRecord, upload } from '../controllers/issueController';

const router = Router();

// POST /api/worker/issues — upload.single('photo') para recibir la imagen
router.post('/issues', upload.single('photo'), createIssue);

// GET /api/worker/issues/:workRecordId — obtener incidencias por registro
router.get('/issues/:workRecordId', getIssuesByWorkRecord);

export default router;
