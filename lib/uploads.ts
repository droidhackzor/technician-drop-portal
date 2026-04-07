import path from 'path';

export function getUploadsRoot() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
}

export function getPublicUploadPath(submissionId: string, filename: string) {
  return `/uploads/${submissionId}/${filename}`;
}
