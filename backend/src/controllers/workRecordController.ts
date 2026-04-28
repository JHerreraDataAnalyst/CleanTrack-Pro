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

    // 3. Análisis de Gasto Diario (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentVerifiedRecords = await prisma.workRecord.findMany({
      where: {
        isVerified: true,
        assignment: {
          date: { gte: sevenDaysAgo }
        }
      },
      include: { assignment: true }
    });

    const dailyMap: { [key: string]: number } = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap[dateStr] = 0;
    }

    recentVerifiedRecords.forEach(record => {
      const dateStr = record.assignment.date.toISOString().split('T')[0];
      if (dailyMap[dateStr] !== undefined) {
        dailyMap[dateStr] += (record.hours * 10);
      }
    });

    const dailySpending = Object.entries(dailyMap).map(([fecha, monto]) => ({
      fecha,
      monto_total: monto
    })).sort((a, b) => a.fecha.localeCompare(b.fecha));

    // 4. Acumulado Mensual por Empleado
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRecords = await prisma.workRecord.findMany({
      where: {
        isVerified: true,
        assignment: { date: { gte: startOfMonth } }
      },
      include: { assignment: true }
    });

    const spendingMap: { [key: string]: number } = {};
    monthlyRecords.forEach(record => {
      const workerId = record.assignment.workerId;
      spendingMap[workerId] = (spendingMap[workerId] || 0) + (record.hours * 10);
    });

    const spendingByEmployee = workers.map(worker => ({
      workerId: worker.id,
      workerName: worker.name,
      monthlyTotal: spendingMap[worker.id] || 0
    }));

    // Añadir el mensual al semáforo
    const enhancedTrafficLight = trafficLight.filter(t => t.status !== 'gray').map(t => ({
      ...t,
      monthlyTotal: spendingMap[t.workerId] || 0
    }));

    res.status(200).json({
      totalPayroll,
      dailySpending,
      spendingByEmployee,
      trafficLight: enhancedTrafficLight
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
