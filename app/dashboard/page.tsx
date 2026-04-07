import Link from 'next/link';
import { Department, Prisma, SubmissionType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { UploadForm } from '@/components/UploadForm';
import { FilterTabs } from '@/components/FilterTabs';
import { redirect } from 'next/navigation';

const scopeOptions = [
  { label: 'Region', value: 'region' },
  { label: 'State', value: 'state' },
  { label: 'FFO', value: 'ffo' },
];

const departmentOptions = [
  { label: 'Fulfillment', value: 'FULFILLMENT' },
  { label: 'Line', value: 'LINE' },
  { label: 'Supervisors', value: 'SUPERVISORS' },
];

function typeLabel(type: SubmissionType) {
  return {
    CUT_DROP: 'Cut Drop',
    TRAPPED_DROP: 'Trapped Drop',
    HAZARDOUS_DROP: 'Hazardous Drop',
  }[type];
}

function departmentLabel(department: Department) {
  return {
    FULFILLMENT: 'Fulfillment',
    LINE: 'Line',
    SUPERVISORS: 'Supervisors',
  }[department];
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    region?: string;
    state?: string;
    ffo?: string;
    type?: string;
    scope?: string;
    department?: string;
    success?: string;
  };
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const scope = searchParams.scope || 'region';
  const department = (searchParams.department || 'FULFILLMENT') as Department;
  const q = searchParams.q?.trim();

  const where: Prisma.SubmissionWhereInput = {
    ...(department ? { department } : {}),
    ...(searchParams.region ? { region: searchParams.region } : {}),
    ...(searchParams.state ? { state: searchParams.state } : {}),
    ...(searchParams.ffo ? { ffo: searchParams.ffo } : {}),
    ...(searchParams.type ? { type: searchParams.type as SubmissionType } : {}),
    ...(q
      ? {
          OR: [
            { houseAddress: { contains: q, mode: 'insensitive' } },
            { metadataAddress: { contains: q, mode: 'insensitive' } },
            { gpsText: { contains: q, mode: 'insensitive' } },
            { notes: { contains: q, mode: 'insensitive' } },
            { region: { contains: q, mode: 'insensitive' } },
            { state: { contains: q, mode: 'insensitive' } },
            { ffo: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [submissions, totalCount, cutCount, trappedCount, hazardCount, regions, states, ffos] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        photos: { orderBy: { createdAt: 'asc' } },
        submittedBy: true,
      },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.submission.count(),
    prisma.submission.count({ where: { type: 'CUT_DROP' } }),
    prisma.submission.count({ where: { type: 'TRAPPED_DROP' } }),
    prisma.submission.count({ where: { type: 'HAZARDOUS_DROP' } }),
    prisma.submission.findMany({ distinct: ['region'], select: { region: true }, orderBy: { region: 'asc' } }),
    prisma.submission.findMany({ distinct: ['state'], select: { state: true }, orderBy: { state: 'asc' } }),
    prisma.submission.findMany({ distinct: ['ffo'], select: { ffo: true }, orderBy: { ffo: 'asc' } }),
  ]);

  const currentQuery = {
    q: searchParams.q,
    region: searchParams.region,
    state: searchParams.state,
    ffo: searchParams.ffo,
    type: searchParams.type,
    scope,
    department,
  };

  return (
    <main className="page-shell">
      <section className="card topbar">
        <div>
          <div className="badge">Operations workspace</div>
          <h1>Cable Drop Portal</h1>
          <p>
            Signed in as {session.fullName} · {session.role === 'LEADERSHIP' ? 'Leadership' : 'Technician'}
          </p>
        </div>
        <div className="topbar-actions">
          <div className="inline-chip">Default sort: newest submissions</div>
          <LogoutButton />
        </div>
      </section>

      <section className="stats">
        <div className="card stat"><div className="small">All submissions</div><div className="value">{totalCount}</div><div className="subtle">Across all regions</div></div>
        <div className="card stat"><div className="small">Cut drops</div><div className="value">{cutCount}</div><div className="subtle">Damage and sever events</div></div>
        <div className="card stat"><div className="small">Trapped drops</div><div className="value">{trappedCount}</div><div className="subtle">Obstructed or pinned lines</div></div>
        <div className="card stat"><div className="small">Hazardous drops</div><div className="value">{hazardCount}</div><div className="subtle">Immediate safety exposure</div></div>
      </section>

      <section className="layout">
        <aside className="card sidebar">
          <div className="sidebar-header">
            <div>
              <div className="badge">Upload queue</div>
              <h3>New incident</h3>
            </div>
          </div>
          {searchParams.success ? <div className="success">Incident uploaded and metadata stored successfully.</div> : null}
          <UploadForm />
        </aside>

        <section className="stack">
          <div className="card panel">
            <div className="badge">Views</div>
            <h2 style={{ marginBottom: 6, letterSpacing: '-0.04em' }}>Filters and department routing</h2>
            <div className="helper">Search by address, metadata-derived address, GPS text, notes, or operational routing fields.</div>

            <FilterTabs basePath="/dashboard" query={currentQuery} field="scope" options={scopeOptions} activeValue={scope} />
            <FilterTabs basePath="/dashboard" query={currentQuery} field="department" options={departmentOptions} activeValue={department} />

            <form className="toolbar" action="/dashboard">
              <input className="input" name="q" defaultValue={searchParams.q} placeholder="Search address, metadata, notes, region, state, or FFO" />
              <select className="select" name="region" defaultValue={searchParams.region || ''}>
                <option value="">All regions</option>
                {regions.map((item) => <option key={item.region} value={item.region}>{item.region}</option>)}
              </select>
              <select className="select" name="state" defaultValue={searchParams.state || ''}>
                <option value="">All states</option>
                {states.map((item) => <option key={item.state} value={item.state}>{item.state}</option>)}
              </select>
              <select className="select" name="ffo" defaultValue={searchParams.ffo || ''}>
                <option value="">All FFOs</option>
                {ffos.map((item) => <option key={item.ffo} value={item.ffo}>{item.ffo}</option>)}
              </select>
              <select className="select" name="type" defaultValue={searchParams.type || ''}>
                <option value="">All types</option>
                <option value="CUT_DROP">Cut Drop</option>
                <option value="TRAPPED_DROP">Trapped Drop</option>
                <option value="HAZARDOUS_DROP">Hazardous Drop</option>
              </select>
              <input type="hidden" name="scope" value={scope} />
              <input type="hidden" name="department" value={department} />
              <button className="button" type="submit">Search</button>
            </form>
          </div>

          {submissions.length === 0 ? (
            <div className="card empty">No submissions match the current search.</div>
          ) : (
            submissions.map((submission) => (
              <article key={submission.id} className="card submission">
                <div className="submission-inner">
                  <div className="photo-box">
                    {submission.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={submission.photos[0].filePath} alt={submission.photos[0].originalName} />
                    ) : (
                      <div className="helper">No preview</div>
                    )}
                  </div>
                  <div className="submission-body">
                    <div className="chips">
                      <span className="chip">{typeLabel(submission.type)}</span>
                      <span className="chip soft">{departmentLabel(submission.department)}</span>
                      <span className="chip soft">{submission.region} · {submission.state} · {submission.ffo}</span>
                    </div>
                    <h3 className="title">{submission.houseAddress}</h3>
                    <div className="helper">Submitted by {submission.submittedBy.fullName} on {submission.submittedAt.toLocaleString()}</div>
                    {submission.notes ? <p style={{ lineHeight: 1.7, marginBottom: 0 }}>{submission.notes}</p> : null}
                    <div className="meta-grid">
                      <div className="meta-box"><strong>GPS</strong>{submission.gpsLat?.toString() || '-'}, {submission.gpsLng?.toString() || '-'}</div>
                      <div className="meta-box"><strong>Metadata address</strong>{submission.metadataAddress || 'Not found in image'}</div>
                      <div className="meta-box"><strong>Captured at</strong>{submission.capturedAt ? submission.capturedAt.toLocaleString() : 'Unknown'}</div>
                      <div className="meta-box"><strong>Photos</strong>{submission.photos.length} saved</div>
                    </div>
                    {submission.metadataJson ? (
                      <div className="metadata-strip">
                        <strong className="section-title">Saved metadata</strong>
                        <code>{JSON.stringify(submission.metadataJson, null, 2).slice(0, 1800)}</code>
                      </div>
                    ) : null}
                    <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                      {submission.photos[0] ? (
                        <Link className="button secondary" href={submission.photos[0].filePath} target="_blank">Open preview</Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
