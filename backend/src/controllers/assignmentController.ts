import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

// GET /api/worker/assignments/:id/validate-closure
export const validateClosure = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        address: {
          include: {
            rooms: true, // Todas las habitaciones esperadas para la dirección
          },
        },
        workRecords: {
          include: {
            room: true,
          },
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    const expectedRooms = assignment.address.rooms;
    const workRecords = assignment.workRecords;

    // Obtener los IDs de las habitaciones que ya tienen un WorkRecord
    const reportedRoomIds = new Set(workRecords.map((wr) => wr.roomId));

    // Filtrar las habitaciones esperadas que NO están en los reportedRoomIds
    const missingRooms = expectedRooms.filter((room) => !reportedRoomIds.has(room.id));

    // Regla: Si hay habitaciones esperadas, se deben reportar todas.
    // Si la dirección no tiene habitaciones predefinidas (expectedRooms.length === 0),
    // debe haber al menos un WorkRecord general (para mantener consistencia, aunque
    // actualmente exigimos habitaciones, cubrimos el caso borde de direcciones sin habitaciones).
    let canClose = false;

    if (expectedRooms.length > 0) {
      canClose = missingRooms.length === 0;
    } else {
      // Si por algún motivo no hay habitaciones en la BD, exigimos al menos un registro libre.
      // Sin embargo, como el sistema nuevo obliga a usar habitaciones, expectedRooms.length
      // debería ser > 0 normalmente.
      canClose = workRecords.length > 0;
    }

    res.status(200).json({
      canClose,
      missingRooms,
    });
  } catch (error) {
    console.error('Error al validar cierre de jornada:', error);
    res.status(500).json({ error: 'Error interno al validar cierre' });
  }
};

// POST /api/worker/assignments/:id/close
export const closeAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        worker: true,
        address: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Asignación no encontrada' });
    }

    if (assignment.status === 'COMPLETED') {
      return res.status(400).json({ error: 'La asignación ya está completada' });
    }

    // Actualizar el estado a COMPLETED
    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });

    // Notificar a todos los administradores
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    if (admins.length > 0) {
      const notificationsData = admins.map((admin) => ({
        title: 'Jornada Finalizada',
        message: `${assignment.worker.name} ha finalizado el servicio en ${assignment.address.street}.`,
        userId: admin.id,
      }));

      await prisma.notification.createMany({
        data: notificationsData,
      });
    }

    res.status(200).json({ message: 'Jornada cerrada exitosamente', assignment: updatedAssignment });
  } catch (error) {
    console.error('Error al cerrar jornada:', error);
    res.status(500).json({ error: 'Error interno al cerrar jornada' });
  }
};
