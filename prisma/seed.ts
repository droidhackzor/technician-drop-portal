import { PrismaClient, UserRole, Department } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const technicianPassword = await bcrypt.hash('MasterPass123', 10);
  const leadershipPassword = await bcrypt.hash('MasterPass123', 10);

  await prisma.user.upsert({
    where: { email: 'tech@example.com' },
    update: {
      name: 'Demo Technician',
      role: UserRole.TECHNICIAN,
      passwordHash: technicianPassword,
      department: Department.FULFILLMENT,
      region: 'Mountain West',
      state: 'Colorado',
      ffo: 'Denver North',
    },
    create: {
      email: 'tech@example.com',
      name: 'Demo Technician',
      role: UserRole.TECHNICIAN,
      passwordHash: technicianPassword,
      department: Department.FULFILLMENT,
      region: 'Mountain West',
      state: 'Colorado',
      ffo: 'Denver North',
    },
  });

  await prisma.user.upsert({
    where: { email: 'leader@example.com' },
    update: {
      name: 'Demo Leadership',
      role: UserRole.LEADERSHIP,
      passwordHash: leadershipPassword,
      department: Department.SUPERVISORS,
      region: 'Mountain West',
      state: 'Colorado',
      ffo: 'Denver North',
    },
    create: {
      email: 'leader@example.com',
      name: 'Demo Leadership',
      role: UserRole.LEADERSHIP,
      passwordHash: leadershipPassword,
      department: Department.SUPERVISORS,
      region: 'Mountain West',
      state: 'Colorado',
      ffo: 'Denver North',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
