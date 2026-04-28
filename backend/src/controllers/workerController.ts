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
