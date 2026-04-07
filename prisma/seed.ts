import { PrismaClient, UserRole, SubmissionType, Department } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const technicianPassword = await bcrypt.hash('tech1234', 10);
  const leadershipPassword = await bcrypt.hash('leader1234', 10);

  const tech = await prisma.user.upsert({
    where: { email: 'tech@example.com' },
    update: {},
    create: {
      email: 'tech@example.com',
      fullName: 'Demo Technician',
      role: UserRole.TECHNICIAN,
      passwordHash: technicianPassword,
    },
  });

  const leader = await prisma.user.upsert({
    where: { email: 'leader@example.com' },
    update: {},
    create: {
      email: 'leader@example.com',
      fullName: 'Demo Leadership',
      role: UserRole.LEADERSHIP,
      passwordHash: leadershipPassword,
    },
  });

  const existing = await prisma.submission.count();
  if (existing === 0) {
    await prisma.submission.createMany({
      data: [
        {
          type: SubmissionType.CUT_DROP,
          region: 'Mountain West',
          state: 'Colorado',
          ffo: 'Denver North',
          department: Department.FULFILLMENT,
          houseAddress: '1432 Lowell Blvd, Denver, CO 80204',
          metadataAddress: '1432 Lowell Blvd, Denver, CO 80204',
          gpsLat: 39.7392,
          gpsLng: -104.9903,
          gpsText: '39.7392, -104.9903',
          notes: 'Main line visually severed at curbside pedestal.',
          submittedById: tech.id,
        },
        {
          type: SubmissionType.HAZARDOUS_DROP,
          region: 'Mountain West',
          state: 'Colorado',
          ffo: 'Grand Junction',
          department: Department.SUPERVISORS,
          houseAddress: '1880 Orchard Ave, Grand Junction, CO 81501',
          metadataAddress: '1880 Orchard Ave, Grand Junction, CO 81501',
          gpsLat: 39.0639,
          gpsLng: -108.5506,
          gpsText: '39.0639, -108.5506',
          notes: 'Low hanging drop across driveway, active safety risk.',
          submittedById: leader.id,
        },
        {
          type: SubmissionType.TRAPPED_DROP,
          region: 'South Central',
          state: 'Texas',
          ffo: 'Fort Worth East',
          department: Department.LINE,
          houseAddress: '2601 N Main St, Fort Worth, TX 76164',
          metadataAddress: '2601 N Main St, Fort Worth, TX 76164',
          gpsLat: 32.7555,
          gpsLng: -97.3308,
          gpsText: '32.7555, -97.3308',
          notes: 'Drop pinned beneath new fence section.',
          submittedById: tech.id,
        },
      ],
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
