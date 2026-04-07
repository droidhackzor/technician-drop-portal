import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
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

function stripNullChars(value: string) {
  return value.replace(/\u0000/g, '').replace(/\0/g, '');
}

function sanitizeJsonValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return stripNullChars(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeJsonValue);

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeJsonValue(nested);
    }
    return out;
  }

  return String(value);
}

function safeFileName(name: string) {
  const cleaned = name.replace(/[^\w.\-]+/g, '_');
  return cleaned.length ? cleaned : 'upload.jpg';
}

function getUploadRoot() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'uploads');
}

function canManageAll(role?: string | null, department?: string | null) {
  return role === 'LEADERSHIP' || department === 'SUPERVISORS';
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submissions = await prisma.submission.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        submittedBy: {
          select: {
            email: true,
            name: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            fileName: true,
            publicUrl: true,
            mimeType: true,
            sizeBytes: true,
            sortOrder: true,
          },
        },
      },
    });

    return NextResponse.json({
      submissions,
      viewer: {
        id: session.id,
        role: session.role,
        department: session.department ?? null,
        canDelete: canManageAll(session.role, session.department),
        canManageAll: canManageAll(session.role, session.department),
      },
    });
  } catch (error) {
    console.error('GET /api/submissions failed:', error);
    return NextResponse.json({ error: 'Failed to load submissions' }, { status: 500 });
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
        { error: 'Invalid submission payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      return NextResponse.json({ error: 'Please upload at least one photo' }, { status: 400 });
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

    const safeMetadataJson = sanitizeJsonValue(primaryMetadata.raw ?? {}) as Prisma.InputJsonValue;

    const created = await prisma.submission.create({
      data: {
        type: parsed.data.type as SubmissionType,
        department: parsed.data.department as Department,
        region: stripNullChars(parsed.data.region),
        state: stripNullChars(parsed.data.state),
        ffo: stripNullChars(parsed.data.ffo),
        address: stripNullChars(parsed.data.address || primaryMetadata.address || '') || undefined,
        latitude: primaryMetadata.latitude,
        longitude: primaryMetadata.longitude,
        gpsText: gpsText ? stripNullChars(gpsText) : undefined,
        capturedAt: primaryMetadata.capturedAt ? new Date(primaryMetadata.capturedAt) : undefined,
        metadataJson: safeMetadataJson,
        notes: parsed.data.notes ? stripNullChars(parsed.data.notes) : undefined,
        submittedById: session.id,
      },
    });

    const uploadRoot = getUploadRoot();
    const submissionDir = path.join(uploadRoot, created.id);
    await mkdir(submissionDir, { recursive: true });

    const imagesData: Prisma.SubmissionImageCreateManyInput[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = path.extname(file.name) || '.jpg';
      const storedName = `${i + 1}-${randomUUID()}${ext}`;
      const originalName = safeFileName(file.name);
      const absPath = path.join(submissionDir, storedName);
      const bytes = Buffer.from(await file.arrayBuffer());

      await writeFile(absPath, bytes);

      imagesData.push({
        submissionId: created.id,
        fileName: originalName,
        storedName,
        filePath: absPath,
        publicUrl: `/api/uploads/${created.id}/${storedName}`,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        sortOrder: i,
      });
    }

    if (imagesData.length) {
      await prisma.submissionImage.createMany({ data: imagesData });
    }

    const submission = await prisma.submission.findUnique({
      where: { id: created.id },
      include: {
        submittedBy: {
          select: {
            email: true,
            name: true,
          },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            fileName: true,
            publicUrl: true,
            mimeType: true,
            sizeBytes: true,
            sortOrder: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('POST /api/submissions failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to create submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
