import { rm } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { SubmissionStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  status: z.enum(['OPEN', 'COMPLETE', 'NOT_VALID']),
  statusNote: z.string().optional(),
});

function canManageAll(role?: string | null, department?: string | null) {
  return role === 'LEADERSHIP' || department === 'SUPERVISORS';
}

function getUploadRoot() {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.resolve(process.cwd(), 'uploads');
}

function stripNullChars(value: string) {
  return value.replace(/\u0000/g, '').replace(/\0/g, '');
}

export async function PATCH(
  req: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid status payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const isSupervisorOrLeadership = canManageAll(session.role, session.department);
    const nextStatus = parsed.data.status as SubmissionStatus;
    const statusNote = stripNullChars(parsed.data.statusNote || '').trim();

    if (
      !isSupervisorOrLeadership &&
      (nextStatus === 'COMPLETE' || nextStatus === 'NOT_VALID') &&
      !statusNote
    ) {
      return NextResponse.json(
        { error: 'Field notes are required when a technician marks a submission complete or not valid.' },
        { status: 400 }
      );
    }

    if (!isSupervisorOrLeadership && nextStatus === 'OPEN') {
      return NextResponse.json(
        { error: 'Technicians cannot reopen submissions.' },
        { status: 403 }
      );
    }

    const updated = await prisma.submission.update({
      where: { id: context.params.id },
      data: {
        status: nextStatus,
        statusNote: statusNote || null,
        statusUpdatedAt: new Date(),
        statusUpdatedById: session.id,
        statusUpdatedByName: session.name || session.email,
      },
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

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    console.error('PATCH /api/submissions/[id] failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to update submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSupervisorOrLeadership = canManageAll(session.role, session.department);
    if (!isSupervisorOrLeadership) {
      return NextResponse.json(
        { error: 'Only supervisors or leadership can delete submissions.' },
        { status: 403 }
      );
    }

    const existing = await prisma.submission.findUnique({
      where: { id: context.params.id },
      include: {
        images: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    await prisma.submission.delete({
      where: { id: context.params.id },
    });

    const submissionDir = path.join(getUploadRoot(), context.params.id);
    await rm(submissionDir, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/submissions/[id] failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete submission';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
