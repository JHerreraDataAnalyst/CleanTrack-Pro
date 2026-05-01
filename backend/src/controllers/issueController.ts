import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configurar la carpeta de uploads
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configurar multer para guardar archivos localmente
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `issue-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se aceptan imágenes (JPEG, PNG, WebP, HEIC).'));
    }
  },
});

// POST /api/worker/issues
// Recibe form-data: workRecordId, description, photo (archivo)
export const createIssue = async (req: Request, res: Response) => {
  try {
    const { workRecordId, description } = req.body;

    if (!workRecordId || !description) {
      return res.status(400).json({ error: 'Faltan campos requeridos (workRecordId, description)' });
    }

    // Verificar que el WorkRecord exista
    const workRecord = await prisma.workRecord.findUnique({
      where: { id: workRecordId },
    });

    if (!workRecord) {
      return res.status(404).json({ error: 'Registro de trabajo no encontrado' });
    }

    // Construir la URL de la imagen si se subió un archivo
    let photoUrl: string | null = null;
    if (req.file) {
      // La URL será relativa al servidor. El frontend la usará con la base URL del backend.
      photoUrl = `/uploads/${req.file.filename}`;
    }

    const issue = await prisma.issue.create({
      data: {
        description,
        photoUrl,
        workRecordId,
      },
    });

    res.status(201).json({ message: 'Incidencia reportada exitosamente', issue });
  } catch (error) {
    console.error('Error createIssue:', error);
    res.status(500).json({ error: 'Error al crear la incidencia' });
  }
};

// GET /api/worker/issues/:workRecordId
// Obtener todas las incidencias de un WorkRecord
export const getIssuesByWorkRecord = async (req: Request, res: Response) => {
  try {
    const { workRecordId } = req.params;

    const issues = await prisma.issue.findMany({
      where: { workRecordId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(issues);
  } catch (error) {
    console.error('Error getIssuesByWorkRecord:', error);
    res.status(500).json({ error: 'Error al obtener incidencias' });
  }
};
