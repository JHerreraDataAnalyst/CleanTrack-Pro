import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import workRecordRoutes from './routes/workRecordRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/work-records', workRecordRoutes);

app.get('/', (req, res) => {
  res.send('Limpieza API is running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
