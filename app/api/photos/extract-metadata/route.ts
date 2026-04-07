import { NextResponse } from 'next/server';
import { extractPhotoMetadata } from '@/lib/photo-metadata';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await extractPhotoMetadata(buffer);

    return NextResponse.json(metadata);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to extract metadata' },
      { status: 500 }
    );
  }
}
