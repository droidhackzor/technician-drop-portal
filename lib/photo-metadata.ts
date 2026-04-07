import exifr from 'exifr';

export type ExtractedMetadata = {
  latitude?: number;
  longitude?: number;
  capturedAt?: string;
  address?: string;
  raw: Record<string, unknown>;
};

function pickAddress(exif: Record<string, unknown>) {
  const candidates = [
    exif.ImageDescription,
    exif.XPSubject,
    exif.XPComment,
    exif.UserComment,
    exif.Address,
    exif.Location,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return undefined;
}

export async function extractPhotoMetadata(buffer: Buffer): Promise<ExtractedMetadata> {
  try {
    const exif = (await exifr.parse(buffer, {
      gps: true,
      exif: true,
      tiff: true,
      ifd0: true,
      xmp: true,
      iptc: true,
      userComment: true,
      multiSegment: true,
      mergeOutput: true,
    })) as Record<string, unknown> | null;

    if (!exif) {
      return { raw: {} };
    }

    const latitude = typeof exif.latitude === 'number' ? exif.latitude : undefined;
    const longitude = typeof exif.longitude === 'number' ? exif.longitude : undefined;
    const dateValue = exif.DateTimeOriginal ?? exif.CreateDate ?? exif.ModifyDate;
    const capturedAt = dateValue instanceof Date ? dateValue.toISOString() : undefined;
    const address = pickAddress(exif);

    return {
      latitude,
      longitude,
      capturedAt,
      address,
      raw: exif,
    };
  } catch {
    return { raw: {} };
  }
}
