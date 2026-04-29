import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// GET /api/admin/employees
export const getEmployees = async (req: Request, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'TRABAJADOR' },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });
    res.status(200).json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
};

// GET /api/admin/addresses
export const getAddresses = async (req: Request, res: Response) => {
  try {
    const addresses = await prisma.address.findMany({
      orderBy: { street: 'asc' }
    });
    res.status(200).json(addresses);
  } catch (error) {
    console.error('Error fetching addresses:', error);
    res.status(500).json({ error: 'Error al obtener sedes' });
  }
};

// GET /api/admin/assignments
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    const whereClause: any = {};
    
    if (startDate && endDate) {
      const targetStartDate = new Date(startDate as string);
      const targetEndDate = new Date(endDate as string);
      targetEndDate.setHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: targetStartDate,
        lte: targetEndDate
      };
    }
    
    if (userId && userId !== 'all') {
      whereClause.workerId = userId as string;
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        address: true,
        worker: {
          select: { name: true }
        }
      },
      orderBy: { date: 'asc' }
    });

    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Error al obtener asignaciones' });
  }
};

// POST /api/admin/assignments
export const createAssignment = async (req: Request, res: Response) => {
  try {
    const { userId, addressId, date } = req.body;

    if (!userId || !addressId || !date) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        workerId: userId as string,
        addressId: addressId as string,
        date: new Date(date as string)
      },
      include: {
        address: true
      }
    });

    res.status(201).json(newAssignment);
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Error al crear asignación' });
  }
};

// DELETE /api/admin/assignments/:id
export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.assignment.delete({
      where: { id: id as string }
    });

    res.status(200).json({ message: 'Asignación eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    
    // Detect Prisma foreign key constraint error (P2003)
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        error: 'No se puede eliminar esta asignación porque el trabajador ya tiene registros (WorkRecords) asociados a ella.' 
      });
    }

    res.status(500).json({ error: 'Error al eliminar asignación' });
  }
};
