import "dotenv/config";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Iniciando el script de Seeding...');

  // 1. Limpiar la base de datos para evitar duplicados si se ejecuta varias veces
  await prisma.notification.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.workRecord.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.room.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // 2. Crear 1 ADMIN
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador Principal',
      email: 'admin@causa.com',
      passwordHash: 'hashed_password_placeholder', // Normalmente se usaría bcrypt
      role: 'ADMIN',
    },
  });
  console.log(`- Admin creado: ${admin.email}`);

  // 3. Crear 10 TRABAJADORES
  const workers = [];
  for (let i = 1; i <= 10; i++) {
    const worker = await prisma.user.create({
      data: {
        name: `Trabajador ${i}`,
        email: `trabajador${i}@causa.com`,
        passwordHash: 'hashed_password_placeholder',
        role: 'TRABAJADOR',
      },
    });
    workers.push(worker);
  }
  console.log(`- ${workers.length} trabajadores creados.`);

  // 4. Crear 5 Direcciones en Madrid con al menos 3 habitaciones cada una
  const addresses = [];
  const callesMadrid = [
    'Gran Vía, 12',
    'Calle de Alcalá, 45',
    'Paseo de la Castellana, 89',
    'Calle Mayor, 4',
    'Calle de Atocha, 120'
  ];
  
  const sampleInstructions = [
    'Las llaves están en la conserjería. Preguntar por Juan.',
    'Código de acceso a la puerta: 4829#',
    'Limpieza profunda requerida en el salón principal.',
    'Por favor, no usar lejía en los baños de mármol.',
    'Llamar antes de llegar para abrir la barrera.'
  ];

  for (let i = 0; i < 5; i++) {
    const address = await prisma.address.create({
      data: {
        street: callesMadrid[i],
        city: 'Madrid',
        state: 'Madrid',
        zipCode: `2800${i + 1}`,
        instructions: sampleInstructions[i],
        contactPhone: `+34 600 123 45${i}`,
        rooms: {
          create: [
            { name: 'Salón Principal' },
            { name: 'Baño Principal' },
            { name: 'Oficina' },
          ],
        },
      },
      include: {
        rooms: true,
      },
    });
    addresses.push(address);
  }
  console.log(`- 5 direcciones creadas en Madrid con sus respectivas habitaciones.`);

  // 5. Generar Asignaciones históricas desde el 1 de Enero de 2026 hasta hoy
  const today = new Date();
  const startDate = new Date('2026-01-01T10:00:00.000Z'); // Evitar problemas de zona horaria
  
  let totalAssignments = 0;
  let totalRecords = 0;

  for (const worker of workers) {
    let currentDate = new Date(startDate);
    
    while (currentDate <= today) {
      // Ignorar domingos (simular descanso) y aleatoriamente un 10% adicional
      if (currentDate.getDay() !== 0 && Math.random() > 0.1) {
        
        const assignmentDate = new Date(currentDate);

        // Asignar aleatoriamente 1 dirección
        const randomAddress = addresses[Math.floor(Math.random() * addresses.length)];

        const assignment = await prisma.assignment.create({
          data: {
            workerId: worker.id,
            addressId: randomAddress.id,
            date: assignmentDate,
          },
        });
        totalAssignments++;

        // Crear WorkRecord para una o más habitaciones de esa dirección
        const numRoomsToClean = Math.floor(Math.random() * 3) + 1;
        const shuffledRooms = [...randomAddress.rooms].sort(() => 0.5 - Math.random());

        for (let r = 0; r < numRoomsToClean; r++) {
          const room = shuffledRooms[r];

          // Registros pasados siempre verificados para simular pagos, hoy pendientes o mixtos
          const isToday = assignmentDate.toDateString() === today.toDateString();
          const isVerified = isToday ? Math.random() < 0.5 : true;
          const hours = Math.random() > 0.5 ? 8 : 4;

          await prisma.workRecord.create({
            data: {
              assignmentId: assignment.id,
              roomId: room.id,
              hours: hours,
              isVerified: isVerified,
              createdAt: assignmentDate, // Forzar la fecha de creación para coherencia histórica
            },
          });
          totalRecords++;
        }
      }
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  console.log(`- Generadas ${totalAssignments} asignaciones y ${totalRecords} registros de trabajo desde Enero 2026.`);

  // 6. Crear un par de incidencias
  await prisma.incident.create({
    data: {
      description: 'Fuga de agua en el Baño Principal. Requiere fontanero urgente para evitar daños en la madera.',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
      addressId: addresses[0].id,
    },
  });

  await prisma.incident.create({
    data: {
      description: 'Mancha severa en la moqueta de la Oficina tras un evento. Necesita máquina de vapor a presión.',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      addressId: addresses[1].id,
    },
  });
  console.log(`- Creadas 2 incidencias con descripciones realistas.`);
  
  // 7. Generar notificaciones de prueba para todos los trabajadores
  for (const worker of workers) {
    await prisma.notification.create({
      data: {
        userId: worker.id,
        title: '¡Bienvenido a CleanTrack Pro!',
        message: 'Revisa tus asignaciones de hoy en el nuevo panel de sedes.',
        isRead: false
      }
    });
    
    // Solo un 30% tienen notificaciones adicionales
    if (Math.random() > 0.7) {
      await prisma.notification.create({
        data: {
          userId: worker.id,
          title: 'Cambio de turno',
          message: 'Se ha modificado el horario de limpieza para la oficina de Gran Vía.',
          isRead: true
        }
      });
    }
  }
  console.log(`- Creadas notificaciones iniciales para los trabajadores.`);

  console.log('¡Seeding de la base de datos completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
