import { prisma } from '@/lib/prisma';
import { Department } from '@prisma/client';

type DashboardPageProps = {
  searchParams?: {
    q?: string;
    region?: string;
    state?: string;
    ffo?: string;
    department?: string;
  };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const q = searchParams?.q?.trim() || '';
  const region = searchParams?.region || '';
  const state = searchParams?.state || '';
  const ffo = searchParams?.ffo || '';
  const department = searchParams?.department || '';

  const where = {
    ...(q
      ? {
          OR: [
            { address: { contains: q, mode: 'insensitive' as const } },
            { gpsText: { contains: q, mode: 'insensitive' as const } },
            { notes: { contains: q, mode: 'insensitive' as const } },
            { region: { contains: q, mode: 'insensitive' as const } },
            { state: { contains: q, mode: 'insensitive' as const } },
            { ffo: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(region ? { region } : {}),
    ...(state ? { state } : {}),
    ...(ffo ? { ffo } : {}),
    ...(department
      ? { department: department as Department }
      : {}),
  };

  const submissions = await prisma.submission.findMany({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      submittedBy: true,
    },
  });

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Technician Drop Portal
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Searchable submissions sorted by newest first
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Department</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Address</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">GPS</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Region</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">State</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">FFO</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Submitted</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600">Technician</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200">
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td className="px-4 py-3">{submission.type}</td>
                  <td className="px-4 py-3">{submission.department}</td>
                  <td className="px-4 py-3">{submission.address ?? '—'}</td>
                  <td className="px-4 py-3">{submission.gpsText ?? '—'}</td>
                  <td className="px-4 py-3">{submission.region}</td>
                  <td className="px-4 py-3">{submission.state}</td>
                  <td className="px-4 py-3">{submission.ffo}</td>
                  <td className="px-4 py-3">
                    {new Date(submission.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {submission.submittedBy?.email ?? '—'}
                  </td>
                </tr>
              ))}

              {submissions.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                    No submissions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
