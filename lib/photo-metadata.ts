import exifr from 'exifr';

export type ExtractedMetadata = {
  latitude?: number;
  longitude?: number;
  address?: string;
  capturedAt?: string;
  gpsText?: string;
  raw?: Record<string, unknown>;
};

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return value;
  }

  return undefined;
}

function extractAddressLikeFields(raw: Record<string, unknown>): string | undefined {
  const candidateKeys = [
    'Address',
    'address',
    'XPComment',
    'ImageDescription',
    'Description',
    'Caption',
    'UserComment',
    'Subject',
    'Headline',
    'Caption-Abstract',
    'City',
    'State',
    'Country',
    'Sub-location',
    'Location',
  ];

  for (const key of candidateKeys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  const city = typeof raw.City === 'string' ? raw.City.trim() : '';
  const state = typeof raw.State === 'string' ? raw.State.trim() : '';
  const country = typeof raw.Country === 'string' ? raw.Country.trim() : '';

  const combined = [city, state, country].filter(Boolean).join(', ');
  return combined || undefined;
}

export async function extractPhotoMetadata(
  buffer: Buffer
): Promise<ExtractedMetadata> {
  try {
    const parsed = (await exifr.parse(buffer, {
      gps: true,
      exif: true,
      iptc: true,
      xmp: true,
      icc: false,
      pick: undefined,
    })) as Record<string, unknown> | null;

    const raw = parsed ?? {};

    const latitude =
      typeof raw.latitude === 'number'
        ? raw.latitude
        : typeof raw.Latitude === 'number'
        ? raw.Latitude
        : undefined;

    const longitude =
      typeof raw.longitude === 'number'
        ? raw.longitude
        : typeof raw.Longitude === 'number'
        ? raw.Longitude
        : undefined;

    const gpsText =
      typeof latitude === 'number' && typeof longitude === 'number'
        ? `${latitude}, ${longitude}`
        : undefined;

    const capturedAt =
      toIsoString(raw.DateTimeOriginal) ||
      toIsoString(raw.CreateDate) ||
      toIsoString(raw.ModifyDate) ||
      toIsoString(raw.DateTimeDigitized);

    const address = extractAddressLikeFields(raw);

    return {
      latitude,
      longitude,
      gpsText,
      address,
      capturedAt,
      raw,
    };
  } catch (error) {
    console.error('Failed to extract photo metadata:', error);

    return {
      raw: {},
    };
  }
}
