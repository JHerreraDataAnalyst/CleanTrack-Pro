import { Router } from 'express';
import { getMySites } from '../controllers/workerController';

const router = Router();

router.get('/my-sites', getMySites);

export default router;
