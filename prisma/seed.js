const { PrismaClient, UserRole, Department } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const technicianPassword = await bcrypt.hash('MasterPass123', 10);
  const leadershipPassword = await bcrypt.hash('MasterPass123', 10);

  await prisma.user.upsert({
    where: { email: 'tech@example.com' },
    update: {
      name: 'Demo Technician',
      passwordHash: technicianPassword,
      role: UserRole.TECHNICIAN,
      department: Department.FULFILLMENT,
      region: 'Mountain West',
      state: 'Colorado',
      ffo: 'Denver North',
    },
    create: {
      email: 'tech@example.com',
      name: 'Demo Technician',
      passwordHash: technicianPassword,
      role: UserRole.TECHNICIAN,
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
      passwordHash: leadershipPassword,
      role: UserRole.LEADERSHIP,
      department: Department.SUPERVISORS,
      region: 'Mountain West',
      state: 'Colorado',
      ffo: 'Denver North',
    },
    create: {
      email: 'leader@example.com',
      name: 'Demo Leadership',
      passwordHash: leadershipPassword,
      role: UserRole.LEADERSHIP,
      department: Department.SUPERVISORS,
      region: 'Mountain West',
      state: 'Colorado',
      ffo: 'Denver North',
    },
  });

  console.log('Seed complete');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
