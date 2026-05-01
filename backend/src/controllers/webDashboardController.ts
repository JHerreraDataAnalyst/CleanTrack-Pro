import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

export const getStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const sOfDay = startOfDay(today);
    const eOfDay = endOfDay(today);
    const sOfWeek = startOfWeek(today, { weekStartsOn: 1 });
    const eOfWeek = endOfWeek(today, { weekStartsOn: 1 });

    const [assignedSites, tasksToday, completedThisWeek, pendingToday] = await Promise.all([
      prisma.address.count(),
      prisma.assignment.count({
        where: { date: { gte: sOfDay, lte: eOfDay } }
      }),
      prisma.assignment.count({
        where: { 
          date: { gte: sOfWeek, lte: eOfWeek },
          status: 'COMPLETED'
        }
      }),
      prisma.assignment.count({
        where: { 
          date: { gte: sOfDay, lte: eOfDay },
          status: 'PENDING'
        }
      })
    ]);

    res.status(200).json({
      assignedSites,
      tasksToday,
      completedThisWeek,
      pending: pendingToday
    });
  } catch (error) {
    console.error('Error in getStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWeeklyActivity = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const sOfWeek = startOfWeek(today, { weekStartsOn: 1 });
    const eOfWeek = endOfWeek(today, { weekStartsOn: 1 });

    const assignments = await prisma.assignment.findMany({
      where: {
        date: { gte: sOfWeek, lte: eOfWeek }
      },
      select: { date: true }
    });

    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const activityMap: Record<string, number> = {
      'Lun': 0, 'Mar': 0, 'Mie': 0, 'Jue': 0, 'Vie': 0, 'Sab': 0, 'Dom': 0
    };

    assignments.forEach(asg => {
      const dayIndex = (asg.date.getDay() + 6) % 7; // Convert 0 (Sun) to index 6, 1 (Mon) to index 0
      activityMap[days[dayIndex]]++;
    });

    const formattedData = days.map(day => ({
      day,
      value: activityMap[day]
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error('Error in getWeeklyActivity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTasksToday = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const sOfDay = startOfDay(today);
    const eOfDay = endOfDay(today);

    const assignments = await prisma.assignment.findMany({
      where: {
        date: { gte: sOfDay, lte: eOfDay }
      },
      include: {
        address: true,
        worker: true
      },
      take: 10,
      orderBy: { date: 'asc' }
    });

    const formattedTasks = assignments.map(asg => ({
      id: asg.id,
      title: `Limpieza en ${asg.address.street}`,
      siteName: asg.address.city,
      dueAt: asg.date.toISOString(),
      type: 'task',
      status: asg.status.toLowerCase()
    }));

    res.status(200).json(formattedTasks);
  } catch (error) {
    console.error('Error in getTasksToday:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
