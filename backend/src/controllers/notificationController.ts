import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// GET /api/notifications
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Falta userId' });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: userId as string },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error getNotifications:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

// POST /api/notifications (Solo Admin)
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { title, message, userId } = req.body;

    if (!title || !message || !userId) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        userId
      }
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error createNotification:', error);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id: id as string },
      data: { isRead: true }
    });

    res.status(200).json(notification);
  } catch (error) {
    console.error('Error markAsRead:', error);
    res.status(500).json({ error: 'Error al actualizar notificación' });
  }
};
