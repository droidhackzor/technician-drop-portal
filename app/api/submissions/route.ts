import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Department, SubmissionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { extractPhotoMetadata } from '@/lib/photo-metadata';
import { getPublicUploadPath, getUploadsRoot } from '@/lib/uploads';

const formSchema = z.object({
  type: z.nativeEnum(SubmissionType),
  region: z.string().min(1),
  state: z.string().min(1),
  ffo: z.string().min(1),
  department: z.nativeEnum(Department),
  houseAddress: z.string().min(1),
  gpsLat: z.string().optional(),
  gpsLng: z.string().optional(),
  notes: z.string().optional(),
});

function parseNumeric(value?: string) {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await request.formData();
  const parsed = formSchema.safeParse({
    type: data.get('type'),
    region: data.get('region'),
    state: data.get('state'),
    ffo: data.get('ffo'),
    department: data.get('department'),
    houseAddress: data.get('houseAddress'),
    gpsLat: data.get('gpsLat'),
    gpsLng: data.get('gpsLng'),
    notes: data.get('notes'),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid submission payload' }, { status: 400 });
  }

  const files = data.getAll('photos').filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: 'At least one photo is required.' }, { status: 400 });
  }

  const primaryMetadata = await extractPhotoMetadata(Buffer.from(await files[0].arrayBuffer()));

  const gpsLat = parseNumeric(parsed.data.gpsLat) ?? primaryMetadata.latitude;
  const gpsLng = parseNumeric(parsed.data.gpsLng) ?? primaryMetadata.longitude;
  const metadataAddress = primaryMetadata.address;
  const houseAddress = parsed.data.houseAddress || metadataAddress || 'Unknown address';
  const gpsText = gpsLat != null && gpsLng != null ? `${gpsLat}, ${gpsLng}` : undefined;

  const submission = await prisma.submission.create({
    data: {
      type: parsed.data.type,
      region: parsed.data.region,
      state: parsed.data.state,
      ffo: parsed.data.ffo,
      department: parsed.data.department,
      houseAddress,
      metadataAddress,
      gpsLat,
      gpsLng,
      gpsText,
      capturedAt: primaryMetadata.capturedAt ? new Date(primaryMetadata.capturedAt) : undefined,
      metadataJson: primaryMetadata.raw,
      notes: parsed.data.notes || undefined,
      submittedById: session.id,
    },
  });

  const uploadDir = path.join(getUploadsRoot(), submission.id);
  await fs.mkdir(uploadDir, { recursive: true });

  await Promise.all(
    files.map(async (file, index) => {
      const ext = path.extname(file.name) || '.jpg';
      const filename = `${Date.now()}-${index}${ext}`;
      const destination = path.join(uploadDir, filename);
      const bytes = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(destination, bytes);

      await prisma.photo.create({
        data: {
          originalName: file.name,
          filePath: getPublicUploadPath(submission.id, filename),
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          submissionId: submission.id,
        },
      });
    })
  );

  return NextResponse.json({ ok: true, id: submission.id });
}
