import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const image = await prisma.submissionImage.findUnique({
      where: { id: params.id },
      select: {
        filePath: true,
        mimeType: true,
      },
    });

    if (!image) {
      return new NextResponse('Not found', { status: 404 });
    }

    const buffer = await readFile(image.filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': image.mimeType || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('GET /api/images/[id] failed:', error);
    return new NextResponse('File not found', { status: 404 });
  }
}
