import { Router } from 'express';
import { 
  getEmployees, 
  getAddresses, 
  getAssignments, 
  createAssignment, 
  deleteAssignment 
} from '../controllers/adminController';

const router = Router();

router.get('/employees', getEmployees);
router.get('/addresses', getAddresses);
router.get('/assignments/:userId/:date', getAssignments);
router.post('/assignments', createAssignment);
router.delete('/assignments/:id', deleteAssignment);

export default router;
