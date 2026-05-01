import { Response } from 'express';
import { startOfMonth, endOfMonth, addMonths, format, parseISO, isBefore } from 'date-fns';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { startDate, endDate } = req.query;

    // Fechas por defecto: Inicio del mes actual hasta fin de mes dentro de 3 meses
    const now = new Date();
    let queryStartDate = startOfMonth(now);
    let queryEndDate = endOfMonth(addMonths(now, 3));

    if (startDate) {
      queryStartDate = new Date(startDate as string);
    }
    if (endDate) {
      queryEndDate = new Date(endDate as string);
      queryEndDate.setHours(23, 59, 59, 999);
    }

    // Regla de negocio: TRABAJADOR puede consultar meses anteriores (historial sin restricciones)

    // Construir la consulta a la BD
    const whereClause: any = {
      date: {
        gte: queryStartDate,
        lte: queryEndDate,
      },
    };

    // Si es trabajador, solo ve sus propias asignaciones
    if (user.role === 'TRABAJADOR') {
      whereClause.workerId = user.id;
    }

    const queryOptions: any = {
      where: whereClause,
      include: {
        address: true,
        worker: {
          select: {
            id: true,
            name: true,
          },
        },
        workRecords: {
          include: {
            room: true,
            issues: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    };

    const assignments: any[] = await prisma.assignment.findMany(queryOptions);

    // Agrupar asignaciones por fecha y calcular total de horas por día
    const groupedData: Record<string, any> = {};

    assignments.forEach((assignment) => {
      // Usamos el formato local de la fecha (Y-m-d)
      const dateKey = format(assignment.date, 'yyyy-MM-dd');
      
      // Calcular horas totales de esta asignación (sumando sus workRecords)
      const assignmentHours = assignment.workRecords.reduce((sum: number, record: any) => sum + record.hours, 0);

      if (!groupedData[dateKey]) {
        groupedData[dateKey] = {
          date: dateKey,
          totalHours: 0,
          assignments: [],
        };
      }

      groupedData[dateKey].totalHours += assignmentHours;
      groupedData[dateKey].assignments.push({
        id: assignment.id,
        address: assignment.address,
        worker: assignment.worker,
        date: assignment.date,
        status: assignment.status,
        totalHours: assignmentHours,
        workRecordsCount: assignment.workRecords.length,
        workRecords: assignment.workRecords,
      });
    });

    // Convertir a array y ordenar
    const result = Object.values(groupedData).sort((a: any, b: any) => 
      a.date.localeCompare(b.date)
    );

    res.status(200).json(result);

  } catch (error) {
    console.error('Error fetching calendar assignments:', error);
    res.status(500).json({ error: 'Error al obtener datos del calendario' });
  }
};
