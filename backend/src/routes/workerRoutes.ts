import { getMySites, getPersonalStats } from '../controllers/workerController';

const router = Router();

router.get('/my-sites', getMySites);
router.get('/stats/me', getPersonalStats);

export default router;
