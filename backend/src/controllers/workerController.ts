import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// GET /api/workers/my-sites
export const getMySites = async (req: Request, res: Response) => {
  try {
    const { workerId } = req.query;

    if (!workerId) {
      return res.status(400).json({ error: 'Falta workerId' });
    }

    const assignments = await prisma.assignment.findMany({
      where: { workerId: workerId as string },
      include: {
        address: true
      }
    });

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
    const targetYear  = year  ? parseInt(year  as string, 10) : now.getFullYear();
    // month is 0-based index (0 = January … 11 = December)
    const targetMonth = month !== undefined ? parseInt(month as string, 10) : now.getMonth();

    // Build a UTC-safe date range so the filter matches Postgres timestamptz values
    // regardless of the server's local timezone.
    // Day 0 of (targetMonth + 1) === last day of targetMonth  ✓
    const periodStart = new Date(Date.UTC(targetYear, targetMonth,     1,  0,  0,  0,   0));
    const periodEnd   = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

    console.log(
      `[Stats] workerId=${workerId} | month=${targetMonth} year=${targetYear}` +
      ` | range ${periodStart.toISOString()} → ${periodEnd.toISOString()}`
    );

    // ── 1. Work records in the period ────────────────────────────────────
    const workRecords = await prisma.workRecord.findMany({
      where: {
        assignment: {
          workerId: workerId as string,
          date: { gte: periodStart, lte: periodEnd },
        },
      },
      select: {
        id: true,
        hours: true,
        isVerified: true,
        isLate: true,
        createdAt: true,
        roomId: true,
        assignmentId: true,
      },
    });

    const totalHours = workRecords.reduce((sum, r) => sum + r.hours, 0);

    // ── 2. Punctuality index ─────────────────────────────────────────────
    const totalReports = workRecords.length;
    const lateCount    = workRecords.filter(r => r.isLate).length;
    const punctualityIndex =
      totalReports > 0
        ? Math.round(((totalReports - lateCount) / totalReports) * 100)
        : 100; // default to 100 % when no data for the period

    // ── 3. Completed services ────────────────────────────────────────────
    const completedServices = await prisma.assignment.count({
      where: {
        workerId: workerId as string,
        status:   'COMPLETED',
        date:     { gte: periodStart, lte: periodEnd },
      },
    });

    // ── 4. Recent history (last 5 work records in the period) ────────────
    const recentRecords = await prisma.workRecord.findMany({
      where: {
        assignment: {
          workerId: workerId as string,
          date: { gte: periodStart, lte: periodEnd },
        },
      },
      include: {
        room: true,
        assignment: { include: { address: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentHistory = recentRecords.map(r => ({
      id:        r.id,
      roomName:  r.room.name,
      address:   r.assignment.address.street,
      hours:     r.hours,
      date:      r.assignment.date.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));

    console.log(
      `[Stats] result → ${workRecords.length} records | ${totalHours}h | ${completedServices} completed`
    );

    return res.status(200).json({
      totalHours,
      punctualityIndex,
      completedServices,
      recentHistory,
      period: { month: targetMonth, year: targetYear },
    });

  } catch (error) {
    console.error('Error getPersonalStats:', error);
    return res.status(500).json({ error: 'Error al obtener estadísticas personales' });
  }
};
