import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import workRecordRoutes from './routes/workRecordRoutes';
import authRoutes from './routes/authRoutes';
import workerRoutes from './routes/workerRoutes';
import notificationRoutes from './routes/notificationRoutes';
import adminRoutes from './routes/adminRoutes';
import calendarRoutes from './routes/calendar.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/work-records', workRecordRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calendar', calendarRoutes);

app.get('/', (req, res) => {
  res.send('Limpieza API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
