import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Department, SubmissionType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { extractPhotoMetadata } from '@/lib/photo-metadata';

const schema = z.object({
  type: z.enum(['CUT_DROP', 'TRAPPED_DROP', 'HAZARDOUS_DROP']),
  department: z.enum(['FULFILLMENT', 'LINE', 'SUPERVISORS']),
  region: z.string(),
  state: z.string(),
  ffo: z.string(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();

    const parsed = schema.safeParse({
      type: formData.get('type'),
      department: formData.get('department'),
      region: formData.get('region'),
      state: formData.get('state'),
      ffo: formData.get('ffo'),
      address: formData.get('address'),
      notes: formData.get('notes'),
    });

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const metadataResults = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return extractPhotoMetadata(buffer);
      })
    );

    const primaryMetadata = metadataResults[0];

    const gpsText =
      primaryMetadata.latitude && primaryMetadata.longitude
        ? `${primaryMetadata.latitude}, ${primaryMetadata.longitude}`
        : undefined;

    const submission = await prisma.submission.create({
      data: {
        type: parsed.data.type as SubmissionType,
        department: parsed.data.department as Department,
        region: parsed.data.region,
        state: parsed.data.state,
        ffo: parsed.data.ffo,
        address:
          parsed.data.address ||
          primaryMetadata.address ||
          'Unknown address',
        latitude: primaryMetadata.latitude,
        longitude: primaryMetadata.longitude,
        gpsText,
        capturedAt: primaryMetadata.capturedAt
          ? new Date(primaryMetadata.capturedAt)
          : undefined,

        // ✅ FIXED LINE
        metadataJson: primaryMetadata.raw as Prisma.InputJsonValue,

        notes: parsed.data.notes || undefined,
        submittedById: session.id,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to create submission' },
      { status: 500 }
    );
  }
}
