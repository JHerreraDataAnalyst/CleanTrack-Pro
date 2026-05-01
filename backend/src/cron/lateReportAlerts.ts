import cron from 'node-cron';
import prisma from '../lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export const initCronJobs = () => {
  // Se ejecuta todos los días a las 23:59
  cron.schedule('59 23 * * *', async () => {
    console.log('[CRON] Verificando tareas sin reportes al final del día...');

    try {
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);

      // Buscar asignaciones de hoy que NO tengan WorkRecords
      const pendingAssignments = await prisma.assignment.findMany({
        where: {
          date: {
            gte: start,
            lte: end,
          },
          workRecords: {
            none: {}, // Asegura que no tenga ningún workRecord asociado
          },
        },
        include: {
          worker: true,
          address: true,
        },
      });

      if (pendingAssignments.length === 0) {
        console.log('[CRON] Todas las asignaciones de hoy tienen reportes.');
        return;
      }

      console.log(`[CRON] Se encontraron ${pendingAssignments.length} asignaciones sin reporte.`);

      // Buscar todos los administradores para notificarles
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
      });

      if (admins.length === 0) return;

      // Generar notificaciones para cada admin por cada asignación faltante
      const notificationsData = pendingAssignments.flatMap((assignment) => {
        return admins.map((admin) => ({
          title: 'Reporte de Horas Pendiente',
          message: `El trabajador ${assignment.worker.name} no ha registrado horas para el servicio en ${assignment.address.street}.`,
          userId: admin.id,
          isRead: false,
        }));
      });

      await prisma.notification.createMany({
        data: notificationsData,
      });

      console.log('[CRON] Notificaciones de alerta generadas con éxito para los administradores.');
    } catch (error) {
      console.error('[CRON] Error al procesar las alertas de reporte tardío:', error);
    }
  });

  console.log('[CRON] Tareas programadas inicializadas.');
};
