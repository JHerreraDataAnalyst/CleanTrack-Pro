import { Router } from 'express';
import { getNotifications, createNotification, markAsRead } from '../controllers/notificationController';

const router = Router();

router.get('/', getNotifications);
router.post('/', createNotification);
router.patch('/:id/read', markAsRead);

export default router;
