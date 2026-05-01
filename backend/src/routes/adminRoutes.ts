import { Router } from 'express';
import { 
  getEmployees, 
  getAddresses, 
  getAssignments, 
  createAssignment, 
  deleteAssignment 
} from '../controllers/adminController';
import { getRoomsByAddress, createAddress, updateAddress } from '../controllers/addressController';
import { exportReport } from '../controllers/reportController';
import { getDashboardStats } from '../controllers/statsController';

const router = Router();

router.get('/employees', getEmployees);

// Stats Dashboard
router.get('/stats/dashboard', getDashboardStats);

// Reportes
router.get('/reports/export', exportReport);

// Address CRUD (con gestión de habitaciones)
router.get('/addresses', getAddresses);
router.post('/addresses', createAddress);
router.patch('/addresses/:id', updateAddress);

// Habitaciones por dirección (para el formulario del trabajador)
router.get('/addresses/:addressId/rooms', getRoomsByAddress);

// Asignaciones
router.get('/assignments', getAssignments);
router.post('/assignments', createAssignment);
router.delete('/assignments/:id', deleteAssignment);

export default router;
