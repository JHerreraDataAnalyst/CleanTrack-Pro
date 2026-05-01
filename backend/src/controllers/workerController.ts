import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// GET /api/workers/my-sites
export const getMySites = async (req: Request, res: Response) => {
  try {
    const { workerId } = req.query;

    if (!workerId) {
      return res.status(400).json({ error: 'Falta workerId' });
    }

    // Obtener asignaciones del trabajador para extraer las direcciones
    const assignments = await prisma.assignment.findMany({
      where: { workerId: workerId as string },
      include: {
        address: true
      }
    });

    // Extraer direcciones únicas
    const uniqueAddressesMap = new Map();
    assignments.forEach(assignment => {
      const addr = assignment.address;
      if (!uniqueAddressesMap.has(addr.id)) {
        uniqueAddressesMap.set(addr.id, addr);
      }
    });

    const sites = Array.from(uniqueAddressesMap.values());

    res.status(200).json(sites);
  } catch (error) {
    console.error('Error getMySites:', error);
    res.status(500).json({ error: 'Error al obtener sedes' });
  }
};

// GET /api/worker/stats/me
export const getPersonalStats = async (req: Request, res: Response) => {
  try {
    const { workerId, month, year } = req.query;

    if (!workerId) {
      return res.status(400).json({ error: 'Falta workerId' });
    }

    const now = new Date();
    const targetYear = year ? parseInt(year as string, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month as string, 10) : now.getMonth();

    const periodStart = new Date(targetYear, targetMonth, 1);
    const periodEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // 1. Horas Totales (del mes)
    const workRecords = await prisma.workRecord.findMany({
      where: {
        assignment: {
          workerId: workerId as string,
          date: { gte: periodStart, lte: periodEnd }
        }
      }
    });

    const totalHours = workRecords.reduce((sum, r) => sum + r.hours, 0);

    // 2. Índice de Puntualidad
    const lateCount = workRecords.filter((r: any) => r.isLate).length;
    const totalReports = workRecords.length;
    const punctualityIndex = totalReports > 0 
      ? Math.round(((totalReports - lateCount) / totalReports) * 100) 
      : 100;

    // 3. Servicios Completados (status === 'COMPLETED')
    const completedServices = await (prisma as any).assignment.count({
      where: {
        workerId: workerId as string,
        status: 'COMPLETED',
        date: { gte: periodStart, lte: periodEnd }
      }
    });

    // 4. Historial Reciente (últimos 5 reportes)
    const recentHistory = await prisma.workRecord.findMany({
      where: {
        assignment: {
          workerId: workerId as string
        }
      },
      include: {
        room: true,
        assignment: {
          include: { address: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const formattedHistory = recentHistory.map(r => ({
      id: r.id,
      roomName: r.room.name,
      address: r.assignment.address.street,
      hours: r.hours,
      date: r.assignment.date,
      createdAt: r.createdAt
    }));

    res.status(200).json({
      totalHours,
      punctualityIndex,
      completedServices,
      recentHistory: formattedHistory,
      period: {
        month: targetMonth,
        year: targetYear
      }
    });
  } catch (error) {
    console.error('Error getPersonalStats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas personales' });
  }
};
