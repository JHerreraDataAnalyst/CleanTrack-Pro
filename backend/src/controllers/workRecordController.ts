import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getWorkRecords = async (req: Request, res: Response) => {
  try {
    const { date, workerId } = req.query;

    const whereClause: any = {};
    
    // Si se envía una fecha, filtrar asignaciones de ese día
    if (date) {
      const filterDate = new Date(date as string);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.assignment = {
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      };
    }

    if (workerId) {
      whereClause.assignment = {
        ...whereClause.assignment,
        workerId: workerId as string
      };
    }

    const workRecords = await prisma.workRecord.findMany({
      where: whereClause,
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
      take: 50
    });
    
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

// GET /api/work-records/dashboard (ADMIN)
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // 1. Gasto total acumulado (Horas verificadas * 10€)
    const verifiedRecords = await prisma.workRecord.findMany({
      where: { isVerified: true },
      select: { hours: true }
    });
    const totalPayroll = verifiedRecords.reduce((sum, record) => sum + record.hours, 0) * 10;

    // 2. Semáforo de trabajadores para HOY
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const workers = await prisma.user.findMany({
      where: { role: 'TRABAJADOR' },
      select: { id: true, name: true }
    });

    // Obtener asignaciones de hoy
    const todayAssignments = await prisma.assignment.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday }
      },
      include: {
        workRecords: true
      }
    });

    const trafficLight = workers.map(worker => {
      const workerAssignments = todayAssignments.filter(a => a.workerId === worker.id);
      
      if (workerAssignments.length === 0) {
        // No tiene asignaciones hoy
        return { workerId: worker.id, workerName: worker.name, status: 'gray' };
      }

      // Tiene asignaciones, buscar si hay WorkRecords de hoy para esas asignaciones
      const workerRecords = workerAssignments.flatMap(a => a.workRecords);

      if (workerRecords.length === 0) {
        // Tiene asignaciones pero no ha creado registros
        return { workerId: worker.id, workerName: worker.name, status: 'red' };
      }

      // Hay registros, verificar si todos están confirmados o si hay alguno sin confirmar
      const hasUnverified = workerRecords.some(r => r.isVerified === false);

      if (hasUnverified) {
        return { workerId: worker.id, workerName: worker.name, status: 'yellow' };
      }

      return { workerId: worker.id, workerName: worker.name, status: 'green' };
    });

    res.status(200).json({
      totalPayroll,
      trafficLight: trafficLight.filter(t => t.status !== 'gray') // Solo mostramos a los que tienen turno hoy
    });
  } catch (error) {
    console.error('Error getDashboardData:', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
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
