import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import workRecordRoutes from './routes/workRecordRoutes';
import authRoutes from './routes/authRoutes';
import workerRoutes from './routes/workerRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import calendarRoutes from './routes/calendar.routes';
import issueRoutes from './routes/issueRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import { initCronJobs } from './cron/lateReportAlerts';
import * as webDashboard from './controllers/webDashboardController';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos de /uploads para las fotos de incidencias
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Inicializar tareas programadas (CRON)
initCronJobs();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/work-records', workRecordRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/worker', issueRoutes);
app.use('/api/worker/assignments', assignmentRoutes);

// Web App Compatibility Routes
app.get('/api/stats', webDashboard.getStats);
app.get('/api/activity/weekly', webDashboard.getWeeklyActivity);
app.get('/api/tasks/today', webDashboard.getTasksToday);

app.get('/', (req, res) => {
  res.send('Limpieza API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
