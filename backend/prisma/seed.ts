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

  for (let i = 0; i < 5; i++) {
    const address = await prisma.address.create({
      data: {
        street: callesMadrid[i],
        city: 'Madrid',
        state: 'Madrid',
        zipCode: `2800${i + 1}`,
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

  // 5. Generar Asignaciones para los últimos 30 días para todos los trabajadores
  const today = new Date();
  let totalAssignments = 0;
  let totalRecords = 0;

  for (const worker of workers) {
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      // Ignorar algunos días aleatoriamente para simular descansos (20% de probabilidad)
      if (Math.random() < 0.2) continue;

      const assignmentDate = new Date(today);
      assignmentDate.setDate(today.getDate() - dayOffset);

      // Asignar aleatoriamente 1 dirección por día a cada trabajador
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
      // Elegimos una cantidad aleatoria de habitaciones (entre 1 y 3)
      const numRoomsToClean = Math.floor(Math.random() * 3) + 1;
      const shuffledRooms = [...randomAddress.rooms].sort(() => 0.5 - Math.random());

      for (let r = 0; r < numRoomsToClean; r++) {
        const room = shuffledRooms[r];

        // 70% verificados, 30% no verificados
        const isVerified = Math.random() < 0.7;

        // Asignar 4 u 8 horas
        const hours = Math.random() > 0.5 ? 8 : 4;

        await prisma.workRecord.create({
          data: {
            assignmentId: assignment.id,
            roomId: room.id,
            hours: hours,
            isVerified: isVerified,
          },
        });
        totalRecords++;
      }
    }
  }
  console.log(`- Generadas ${totalAssignments} asignaciones y ${totalRecords} registros de trabajo en los últimos 30 días.`);

  // 6. Crear un par de incidencias
  await prisma.incident.create({
    data: {
      description: 'Fuga de agua en el Baño Principal. Requiere fontanero urgente para evitar daños en la madera.',
      photoUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', // Ejemplo
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
