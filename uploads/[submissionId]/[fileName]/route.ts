import { readFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getUploadRoot() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'uploads');
}

export async function GET(
  _req: Request,
  context: { params: { submissionId: string; fileName: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { submissionId, fileName } = context.params;

    const image = await prisma.submissionImage.findFirst({
      where: {
        submissionId,
        storedName: fileName,
      },
      select: {
        filePath: true,
        mimeType: true,
      },
    });

    if (!image) {
      return new NextResponse('Not found', { status: 404 });
    }

    const uploadRoot = getUploadRoot();
    const resolved = path.resolve(image.filePath);

    if (!resolved.startsWith(uploadRoot)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const file = await readFile(resolved);

    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': image.mimeType || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('GET /api/uploads failed:', error);
    return new NextResponse('Failed to load file', { status: 500 });
  }
}
