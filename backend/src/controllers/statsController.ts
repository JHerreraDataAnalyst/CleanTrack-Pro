import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

// GET /api/admin/stats/dashboard?month=4&year=2026
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const month = parseInt(req.query.month as string); // 0-indexed
    const monthIndex = isNaN(month) ? now.getMonth() : month;

    const periodStart = startOfMonth(new Date(year, monthIndex, 1));
    const periodEnd = endOfMonth(new Date(year, monthIndex, 1));

    // ─── Query 1: Puntualidad por trabajador ─────────────────────────────────
    // Obtiene todos los WorkRecords del período agrupados por worker
    const workRecords = await (prisma as any).workRecord.findMany({
      where: {
        assignment: {
          date: { gte: periodStart, lte: periodEnd },
        },
      },
      include: {
        assignment: {
          include: {
            worker: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Agrupar por trabajador y contar a tiempo vs tardíos
    const punctualityMap: Record<string, { name: string; onTime: number; late: number }> = {};
    for (const wr of workRecords) {
      const workerId = wr.assignment.worker.id;
      const workerName = wr.assignment.worker.name;
      if (!punctualityMap[workerId]) {
        punctualityMap[workerId] = { name: workerName, onTime: 0, late: 0 };
      }
      if (wr.isLate) {
        punctualityMap[workerId].late += 1;
      } else {
        punctualityMap[workerId].onTime += 1;
      }
    }

    const punctuality = Object.entries(punctualityMap).map(([id, data]) => {
      const total = data.onTime + data.late;
      return {
        workerId: id,
        workerName: data.name,
        onTime: data.onTime,
        late: data.late,
        total,
        onTimePercent: total > 0 ? Math.round((data.onTime / total) * 100) : 0,
        latePercent: total > 0 ? Math.round((data.late / total) * 100) : 0,
      };
    });

    // Global punctuality totals for the donut
    const totalOnTime = punctuality.reduce((s, w) => s + w.onTime, 0);
    const totalLate = punctuality.reduce((s, w) => s + w.late, 0);
    const totalRecords = totalOnTime + totalLate;
    const globalOnTimePercent = totalRecords > 0 ? Math.round((totalOnTime / totalRecords) * 100) : 0;

    // ─── Query 2: Horas por trabajador (bar chart) ───────────────────────────
    const hoursPerWorker = Object.entries(punctualityMap).map(([id, data]) => {
      const workerHours = workRecords
        .filter((wr: any) => wr.assignment.worker.id === id)
        .reduce((sum: number, wr: any) => sum + wr.hours, 0);
      return {
        workerId: id,
        workerName: data.name,
        totalHours: Math.round(workerHours * 10) / 10,
      };
    }).sort((a, b) => b.totalHours - a.totalHours);

    // ─── Query 3: Carga de trabajo por sede (dirección) ──────────────────────
    const hoursPerSite: Record<string, { street: string; hours: number }> = {};
    for (const wr of workRecords) {
      // Need address from assignment
    }

    const assignmentsWithHours = await (prisma as any).assignment.findMany({
      where: { date: { gte: periodStart, lte: periodEnd } },
      include: {
        address: { select: { id: true, street: true } },
        workRecords: { select: { hours: true } },
      },
    });

    const siteHoursMap: Record<string, { street: string; hours: number }> = {};
    for (const a of assignmentsWithHours) {
      const siteId = a.address.id;
      if (!siteHoursMap[siteId]) {
        siteHoursMap[siteId] = { street: a.address.street, hours: 0 };
      }
      for (const wr of a.workRecords) {
        siteHoursMap[siteId].hours += wr.hours;
      }
    }

    const siteWorkload = Object.entries(siteHoursMap)
      .map(([id, data]) => ({
        siteId: id,
        street: data.street,
        totalHours: Math.round(data.hours * 10) / 10,
      }))
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 8);

    // ─── Query 4: Hotspots de incidencias (top 5 sitios) ────────────────────
    // Issues → WorkRecord → Assignment → Address
    const issuesInPeriod = await (prisma as any).issue.findMany({
      where: {
        workRecord: {
          assignment: {
            date: { gte: periodStart, lte: periodEnd },
          },
        },
      },
      include: {
        workRecord: {
          include: {
            assignment: {
              include: {
                address: { select: { id: true, street: true, city: true } },
              },
            },
          },
        },
      },
    });

    const issueHotspotMap: Record<string, { street: string; city: string; count: number }> = {};
    for (const issue of issuesInPeriod) {
      const addr = issue.workRecord.assignment.address;
      if (!issueHotspotMap[addr.id]) {
        issueHotspotMap[addr.id] = { street: addr.street, city: addr.city, count: 0 };
      }
      issueHotspotMap[addr.id].count += 1;
    }

    const issueHotspots = Object.entries(issueHotspotMap)
      .map(([id, data]) => ({
        siteId: id,
        street: data.street,
        city: data.city,
        issueCount: data.count,
      }))
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, 5);

    res.status(200).json({
      period: {
        year,
        month: monthIndex,
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      },
      globalPunctuality: {
        onTime: totalOnTime,
        late: totalLate,
        total: totalRecords,
        onTimePercent: globalOnTimePercent,
        latePercent: 100 - globalOnTimePercent,
      },
      punctualityByWorker: punctuality,
      hoursPerWorker,
      siteWorkload,
      issueHotspots,
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas del dashboard' });
  }
};
