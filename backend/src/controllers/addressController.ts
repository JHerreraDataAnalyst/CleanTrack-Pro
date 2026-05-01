import { Request, Response } from 'express';
import prisma from '../lib/prisma';

// GET /api/addresses/:addressId/rooms
// Devuelve todas las habitaciones predefinidas para una dirección específica
export const getRoomsByAddress = async (req: Request, res: Response) => {
  try {
    const { addressId } = req.params;

    const rooms = await prisma.room.findMany({
      where: { addressId },
      orderBy: { name: 'asc' },
    });

    res.status(200).json(rooms);
  } catch (error) {
    console.error('Error getRoomsByAddress:', error);
    res.status(500).json({ error: 'Error al obtener habitaciones' });
  }
};

// POST /api/addresses - Crear una dirección con sus habitaciones predefinidas
export const createAddress = async (req: Request, res: Response) => {
  try {
    const { street, city, state, zipCode, instructions, contactPhone, rooms } = req.body;

    if (!street || !city) {
      return res.status(400).json({ error: 'Los campos "street" y "city" son obligatorios.' });
    }

    // Usar una transacción para garantizar atomicidad: si falla la creación de una room, se revierte todo.
    const newAddress = await prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          street,
          city,
          state: state ?? null,
          zipCode: zipCode ?? null,
          instructions: instructions ?? null,
          contactPhone: contactPhone ?? null,
        },
      });

      // Crear las habitaciones predefinidas si se enviaron
      if (Array.isArray(rooms) && rooms.length > 0) {
        const roomNames: string[] = rooms.filter((r: any) => typeof r === 'string' && r.trim() !== '');
        if (roomNames.length > 0) {
          await tx.room.createMany({
            data: roomNames.map((name) => ({
              name: name.trim(),
              addressId: address.id,
            })),
          });
        }
      }

      // Retornar la dirección completa con sus habitaciones
      return tx.address.findUnique({
        where: { id: address.id },
        include: { rooms: { orderBy: { name: 'asc' } } },
      });
    });

    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error createAddress:', error);
    res.status(500).json({ error: 'Error al crear la dirección' });
  }
};

// PATCH /api/addresses/:id - Editar dirección y sincronizar sus habitaciones
export const updateAddress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { street, city, state, zipCode, instructions, contactPhone, rooms } = req.body;

    const updatedAddress = await prisma.$transaction(async (tx) => {
      // 1. Actualizar los datos de la dirección
      await tx.address.update({
        where: { id },
        data: {
          ...(street && { street }),
          ...(city && { city }),
          state: state ?? undefined,
          zipCode: zipCode ?? undefined,
          instructions: instructions ?? undefined,
          contactPhone: contactPhone ?? undefined,
        },
      });

      // 2. Si se envía una nueva lista de habitaciones, sincronizarla.
      // Solo añadimos nuevas. NO eliminamos las existentes para no romper WorkRecords ya creados.
      if (Array.isArray(rooms) && rooms.length > 0) {
        const existingRooms = await tx.room.findMany({ where: { addressId: id } });
        const existingNames = new Set(existingRooms.map((r) => r.name.toLowerCase()));

        const newRoomNames = (rooms as string[])
          .filter((r) => typeof r === 'string' && r.trim() !== '')
          .filter((r) => !existingNames.has(r.trim().toLowerCase()));

        if (newRoomNames.length > 0) {
          await tx.room.createMany({
            data: newRoomNames.map((name) => ({
              name: name.trim(),
              addressId: id,
            })),
          });
        }
      }

      return tx.address.findUnique({
        where: { id },
        include: { rooms: { orderBy: { name: 'asc' } } },
      });
    });

    res.status(200).json(updatedAddress);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Dirección no encontrada.' });
    }
    console.error('Error updateAddress:', error);
    res.status(500).json({ error: 'Error al actualizar la dirección' });
  }
};
