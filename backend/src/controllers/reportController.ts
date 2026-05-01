import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { isBefore, startOfDay, endOfDay } from 'date-fns';

export const exportReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, workerId, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Faltan parámetros startDate y endDate' });
    }

    // Filtros base
    const whereClause: any = {
      createdAt: {
        gte: new Date(startDate as string),
        lte: endOfDay(new Date(endDate as string)),
      },
    };

    if (workerId && workerId !== 'all') {
      whereClause.assignment = {
        workerId: workerId as string,
      };
    }

    // Obtener los registros crudos con sus relaciones
    const workRecords = await prisma.workRecord.findMany({
      where: whereClause,
      include: {
        room: true,
        assignment: {
          include: {
            address: true,
            worker: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Cálculos de resumen
    let totalHours = 0;
    let onTimeCount = 0;
    let lateCount = 0;

    const workerSummary: Record<string, { name: string; hours: number; onTime: number; late: number }> = {};

    workRecords.forEach((record) => {
      totalHours += record.hours;
      
      if (record.isLate) {
        lateCount++;
      } else {
        onTimeCount++;
      }

      const wId = record.assignment.workerId;
      if (!workerSummary[wId]) {
        workerSummary[wId] = {
          name: record.assignment.worker.name,
          hours: 0,
          onTime: 0,
          late: 0,
        };
      }
      
      workerSummary[wId].hours += record.hours;
      if (record.isLate) {
        workerSummary[wId].late++;
      } else {
        workerSummary[wId].onTime++;
      }
    });

    const totalRecords = onTimeCount + lateCount;
    const punctualityIndex = totalRecords > 0 ? Math.round((onTimeCount / totalRecords) * 100) : 0;

    // Retorno en formato CSV
    if (format === 'csv') {
      const BOM = '\uFEFF';
      const headers = ['Trabajador', 'Sede', 'Habitacion', 'Fecha', 'Horas', 'Puntualidad', 'Notas'];
      
      const rows = workRecords.map((r) => {
        const dateStr = r.createdAt.toISOString().split('T')[0];
        const punctualStr = r.isLate ? 'Tardio' : 'A tiempo';
        const addressName = `${r.assignment.address.street}, ${r.assignment.address.city}`.replace(/,/g, ' '); // Evitar comas en CSV
        const roomName = r.room.name.replace(/,/g, ' ');
        const notes = ''; // Espacio para notas futuras
        
        return `"${r.assignment.worker.name}","${addressName}","${roomName}","${dateStr}",${r.hours},"${punctualStr}","${notes}"`;
      });

      const csvContent = BOM + headers.join(',') + '\n' + rows.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte_cleantrack.csv"');
      return res.status(200).send(csvContent);
    }

    // Retorno en formato JSON
    return res.status(200).json({
      summary: {
        totalHours,
        onTimeCount,
        lateCount,
        punctualityIndex,
        totalRecords,
      },
      workerSummary: Object.values(workerSummary).map(w => ({
        ...w,
        punctualityIndex: (w.onTime + w.late) > 0 ? Math.round((w.onTime / (w.onTime + w.late)) * 100) : 0
      })),
      recordsCount: workRecords.length,
    });
  } catch (error) {
    console.error('Error exportReport:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
};
