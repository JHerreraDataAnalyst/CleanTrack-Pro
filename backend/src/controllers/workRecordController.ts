import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getWorkRecords = async (req: Request, res: Response) => {
  try {
    const { date, workerId } = req.query;

    const whereClause: any = {};
    
    if (date) {
      const filterDate = new Date(date as string);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    if (workerId) {
      whereClause.workerId = workerId as string;
    }

    // Buscamos ASIGNACIONES (que es lo que el trabajador "tiene que hacer")
    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        address: true,
        workRecords: {
          include: { room: true }
        },
      },
      orderBy: {
        date: 'asc'
      }
    });
    
    // Formatear para que el frontend sepa si hay registros o no
    const formatted = assignments.flatMap(asg => {
      // Si no tiene registros, devolvemos un objeto base para que aparezca el botón "Registrar"
      if (asg.workRecords.length === 0) {
        return [{
          id: `asg-${asg.id}`,
          assignmentId: asg.id,
          address: asg.address.street,
          room: "General", // O podrías traer las habitaciones de la dirección
          date: asg.date,
          hours: 0,
          isVerified: false,
          hasRecord: false
        }];
      }

      // Si tiene registros, los devolvemos
      return asg.workRecords.map(record => ({
        id: record.id,
        assignmentId: asg.id,
        address: asg.address.street,
        room: record.room.name,
        date: asg.date,
        hours: record.hours,
        isVerified: record.isVerified,
        hasRecord: true
      }));
    });

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error getWorkRecords:', error);
    res.status(500).json({ error: 'Error al obtener asignaciones' });
  }
};

// GET /api/work-records/dashboard (ADMIN)
export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.query;
    
    // Default to current month/year if not provided (month is 0-indexed in JS)
    const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string, 10) : new Date().getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // 1. Gasto total del mes seleccionado (Horas verificadas * 10€)
    const monthlyVerifiedRecords = await prisma.workRecord.findMany({
      where: {
        isVerified: true,
        assignment: {
          date: { gte: startOfMonth, lte: endOfMonth }
        }
      },
      include: { assignment: true }
    });
    
    const totalPayroll = monthlyVerifiedRecords.reduce((sum, record) => sum + record.hours, 0) * 10;

    // 2. Análisis de Gasto Diario (para todo el mes)
    const numDays = endOfMonth.getDate();
    const dailyMap: { [key: string]: number } = {};
    for (let i = 1; i <= numDays; i++) {
      // Usamos UTC para evitar desfaces de zona horaria al aislar el YYYY-MM-DD
      const dateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      dailyMap[dateStr] = 0;
    }

    monthlyVerifiedRecords.forEach(record => {
      const dateStr = record.assignment.date.toISOString().split('T')[0];
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += (record.hours * 10);
      }
    });

    const dailySpending = Object.entries(dailyMap).map(([fecha, monto]) => ({
      fecha,
      monto_total: monto
    })).sort((a, b) => a.fecha.localeCompare(b.fecha));

    // 3. Semáforo Mensual de trabajadores y Acumulado
    const workers = await prisma.user.findMany({
      where: { role: 'TRABAJADOR' },
      select: { id: true, name: true }
    });

    const monthlyAssignments = await prisma.assignment.findMany({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      include: { workRecords: true }
    });

    const trafficLight = workers.map(worker => {
      const workerAssignments = monthlyAssignments.filter(a => a.workerId === worker.id);
      
      if (workerAssignments.length === 0) {
        return { workerId: worker.id, workerName: worker.name, status: 'gray', monthlyTotal: 0 };
      }

      const workerRecords = workerAssignments.flatMap(a => a.workRecords);
      const monthlyTotal = workerRecords.filter(r => r.isVerified).reduce((sum, r) => sum + r.hours, 0) * 10;

      if (workerRecords.length === 0) {
        return { workerId: worker.id, workerName: worker.name, status: 'red', monthlyTotal };
      }

      const hasUnverified = workerRecords.some(r => r.isVerified === false);

      if (hasUnverified) {
        return { workerId: worker.id, workerName: worker.name, status: 'yellow', monthlyTotal };
      }

      return { workerId: worker.id, workerName: worker.name, status: 'green', monthlyTotal };
    }).filter(t => t.status !== 'gray');

    res.status(200).json({
      totalPayroll,
      dailySpending,
      trafficLight
    });
  } catch (error) {
    console.error('Error getDashboardData:', error);
    res.status(500).json({ error: 'Error al obtener datos del dashboard' });
  }
};

// GET /api/work-records/my-history (TRABAJADOR)
export const getMyHistory = async (req: Request, res: Response) => {
  try {
    const { workerId } = req.query;

    if (!workerId) {
      return res.status(400).json({ error: 'Falta workerId' });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const allRecords = await prisma.workRecord.findMany({
      where: {
        assignment: {
          workerId: workerId as string,
          date: { gte: startOfMonth }
        }
      },
      include: {
        room: true,
        assignment: {
          include: { address: true }
        }
      },
      orderBy: {
        assignment: { date: 'desc' }
      }
    });

    const verifiedRecords = allRecords.filter(r => r.isVerified);
    const totalHours = verifiedRecords.reduce((sum, record) => sum + record.hours, 0);
    const estimatedPay = totalHours * 10;

    const formattedRecords = allRecords.map(record => ({
      id: record.id,
      address: record.assignment.address.street,
      room: record.room.name,
      date: record.assignment.date,
      hours: record.hours,
      isVerified: record.isVerified
    }));

    res.status(200).json({
      totalHours,
      estimatedPay,
      records: formattedRecords
    });
  } catch (error) {
    console.error('Error getMyHistory:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
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
