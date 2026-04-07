import { NextResponse } from 'next/server';
import { extractPhotoMetadata } from '@/lib/photo-metadata';

export async function POST(request: Request) {
  const data = await request.formData();
  const photo = data.get('photo');

  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: 'A photo file is required.' }, { status: 400 });
  }

  const buffer = Buffer.from(await photo.arrayBuffer());
  const metadata = await extractPhotoMetadata(buffer);

  return NextResponse.json({
    latitude: metadata.latitude,
    longitude: metadata.longitude,
    address: metadata.address,
    capturedAt: metadata.capturedAt,
    source: Object.keys(metadata.raw).length ? 'embedded-metadata' : 'none',
  });
}
