import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/work-records
export const logHours = async (req: Request, res: Response) => {
  try {
    const { assignmentId, roomId, hours } = req.body;

    if (!assignmentId || !roomId || hours === undefined) {
      return res.status(400).json({ error: 'Faltan campos requeridos (assignmentId, roomId, hours)' });
    }

    const workRecord = await prisma.workRecord.create({
      data: {
        assignmentId,
        roomId,
        hours,
        isVerified: false,
      },
    });

    res.status(201).json({ message: 'Horas cargadas exitosamente', workRecord });
  } catch (error) {
    console.error('Error logHours:', error);
    res.status(500).json({ error: 'Error al cargar horas' });
  }
};

// PATCH /api/work-records/:id/verify
export const verifyWorkRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const workRecord = await prisma.workRecord.update({
      where: { id },
      data: { isVerified: true },
    });

    res.status(200).json({ message: 'Registro verificado exitosamente', workRecord });
  } catch (error) {
    console.error('Error verifyWorkRecord:', error);
    res.status(500).json({ error: 'Error al verificar registro' });
  }
};
