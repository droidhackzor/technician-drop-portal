import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Department, Prisma, SubmissionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { extractPhotoMetadata } from '@/lib/photo-metadata';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const submissionSchema = z.object({
  type: z.enum(['CUT_DROP', 'TRAPPED_DROP', 'HAZARDOUS_DROP']),
  department: z.enum(['FULFILLMENT', 'LINE', 'SUPERVISORS']),
  region: z.string().min(1),
  state: z.string().min(1),
  ffo: z.string().min(1),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submissions = await prisma.submission.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        submittedBy: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('GET /api/submissions failed:', error);
    return NextResponse.json(
      { error: 'Failed to load submissions' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();

    const parsed = submissionSchema.safeParse({
      type: formData.get('type'),
      department: formData.get('department'),
      region: formData.get('region'),
      state: formData.get('state'),
      ffo: formData.get('ffo'),
      address: formData.get('address') || '',
      notes: formData.get('notes') || '',
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid submission payload',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Please upload at least one photo' },
        { status: 400 }
      );
    }

    const metadataResults = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return extractPhotoMetadata(buffer);
      })
    );

    const primaryMetadata = metadataResults[0];

    const gpsText =
      primaryMetadata.gpsText ||
      (typeof primaryMetadata.latitude === 'number' &&
      typeof primaryMetadata.longitude === 'number'
        ? `${primaryMetadata.latitude}, ${primaryMetadata.longitude}`
        : undefined);

    const safeMetadataJson = JSON.parse(
      JSON.stringify(primaryMetadata.raw ?? {})
    ) as Prisma.InputJsonValue;

    const submission = await prisma.submission.create({
      data: {
        type: parsed.data.type as SubmissionType,
        department: parsed.data.department as Department,
        region: parsed.data.region,
        state: parsed.data.state,
        ffo: parsed.data.ffo,
        address: parsed.data.address || primaryMetadata.address || undefined,
        latitude: primaryMetadata.latitude,
        longitude: primaryMetadata.longitude,
        gpsText,
        capturedAt: primaryMetadata.capturedAt
          ? new Date(primaryMetadata.capturedAt)
          : undefined,
        metadataJson: safeMetadataJson,
        notes: parsed.data.notes || undefined,
        submittedById: session.id,
      },
      include: {
        submittedBy: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('POST /api/submissions failed:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to create submission';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
