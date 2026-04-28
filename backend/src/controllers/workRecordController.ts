import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getWorkRecords = async (req: Request, res: Response) => {
  try {
    const workRecords = await prisma.workRecord.findMany({
      include: {
        room: true,
        assignment: {
          include: {
            address: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Limit to recent 20 for the UI
    });
    
    // Formatear para que el frontend lo consuma fácilmente
    const formattedRecords = workRecords.map(record => ({
      id: record.id,
      address: record.assignment.address.street,
      room: record.room.name,
      date: record.assignment.date,
      hours: record.hours,
      isVerified: record.isVerified
    }));

    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error('Error getWorkRecords:', error);
    res.status(500).json({ error: 'Error al obtener registros' });
  }
};

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
      where: { id: id as string },
      data: { isVerified: true },
    });

    res.status(200).json({ message: 'Registro verificado exitosamente', workRecord });
  } catch (error) {
    console.error('Error verifyWorkRecord:', error);
    res.status(500).json({ error: 'Error al verificar registro' });
  }
};
