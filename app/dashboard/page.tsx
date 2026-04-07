'use client';

import { useEffect, useMemo, useState } from 'react';

type Submission = {
  id: string;
  type: 'CUT_DROP' | 'TRAPPED_DROP' | 'HAZARDOUS_DROP';
  department: 'FULFILLMENT' | 'LINE' | 'SUPERVISORS';
  region: string;
  state: string;
  ffo: string;
  address?: string | null;
  gpsText?: string | null;
  notes?: string | null;
  createdAt: string;
  submittedBy?: {
    email?: string | null;
    name?: string | null;
  } | null;
};

type MetadataResponse = {
  latitude?: number;
  longitude?: number;
  gpsText?: string;
  address?: string;
  capturedAt?: string;
};

const typeLabels: Record<Submission['type'], string> = {
  CUT_DROP: 'Cut Drop',
  TRAPPED_DROP: 'Trapped Drop',
  HAZARDOUS_DROP: 'Hazardous Drop',
};

const deptLabels: Record<Submission['department'], string> = {
  FULFILLMENT: 'Fulfillment',
  LINE: 'Line',
  SUPERVISORS: 'Supervisors',
};

export default function DashboardPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<Submission['type']>('CUT_DROP');
  const [department, setDepartment] = useState<Submission['department']>('FULFILLMENT');
  const [region, setRegion] = useState('Mountain West');
  const [stateName, setStateName] = useState('Colorado');
  const [ffo, setFfo] = useState('Denver North');
  const [address, setAddress] = useState('');
  const [gpsText, setGpsText] = useState('');
  const [notes, setNotes] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metadataPreview, setMetadataPreview] = useState<MetadataResponse | null>(null);

  async function loadSubmissions() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/submissions', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load submissions');
      }

      setSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSubmissions();
  }, []);

  async function extractMetadata(selectedFiles: File[]) {
    if (!selectedFiles.length) return;

    try {
      setExtracting(true);
      setError('');

      const formData = new FormData();
      formData.append('file', selectedFiles[0]);

      const res = await fetch('/api/photos/extract-metadata', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to extract metadata');
      }

      const parsed = data as MetadataResponse;
      setMetadataPreview(parsed);

      if (parsed.address) setAddress(parsed.address);

      const gps =
        parsed.gpsText ||
        (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number'
          ? `${parsed.latitude}, ${parsed.longitude}`
          : '');

      if (gps) setGpsText(gps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract metadata');
    } finally {
      setExtracting(false);
    }
  }

  async function handleFileChange(nextFiles: FileList | null) {
    const selected = nextFiles ? Array.from(nextFiles) : [];
    setFiles(selected);
    if (selected.length) {
      await extractMetadata(selected);
    } else {
      setMetadataPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!files.length) {
      setError('Please select at least one photo.');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('type', type);
      formData.append('department', department);
      formData.append('region', region);
      formData.append('state', stateName);
      formData.append('ffo', ffo);
      formData.append('address', address);
      formData.append('notes', notes);

      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create submission');
      }

      setSuccess('Submission created successfully.');
      setFiles([]);
      setMetadataPreview(null);
      setAddress('');
      setGpsText('');
      setNotes('');
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create submission');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submissions;

    return submissions.filter((item) => {
      const haystack = [
        item.id,
        item.address,
        item.gpsText,
        item.region,
        item.state,
        item.ffo,
        item.notes,
        item.submittedBy?.email,
        item.submittedBy?.name,
        typeLabels[item.type],
        deptLabels[item.department],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [submissions, search]);

  return (
    <main className="linear-shell">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="linear-topbar mb-6 flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="linear-badge mb-3">Cable Ops Portal</div>
            <h1 className="linear-page-title">Technician Drop Portal</h1>
            <p className="mt-2 text-sm linear-muted">
              Upload field photos, review metadata, and track cut, trapped, and hazardous drops.
            </p>
          </div>

          <button onClick={handleLogout} className="linear-button secondary">
            Sign out
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="linear-card p-5">
            <div className="mb-5">
              <h2 className="linear-section-title">New submission</h2>
              <p className="mt-1 text-sm linear-muted">
                Add one or more photos and submit a new report.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-[22px] border border-dashed border-zinc-300 bg-white/70 p-4">
                <label className="linear-label">Photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleFileChange(e.target.files)}
                  className="linear-input"
                />
                <p className="mt-2 text-xs linear-muted">
                  Multiple files supported. Metadata preview uses the first image.
                </p>

                {files.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-3">
                    <div className="mb-2 text-sm font-semibold text-zinc-800">
                      {files.length} file(s) selected
                    </div>
                    <ul className="space-y-1 text-sm text-zinc-600">
                      {files.map((file) => (
                        <li key={file.name} className="truncate">
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="linear-label">Issue Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Submission['type'])}
                    className="linear-input"
                  >
                    <option value="CUT_DROP">Cut Drop</option>
                    <option value="TRAPPED_DROP">Trapped Drop</option>
                    <option value="HAZARDOUS_DROP">Hazardous Drop</option>
                  </select>
                </div>

                <div>
                  <label className="linear-label">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Submission['department'])}
                    className="linear-input"
                  >
                    <option value="FULFILLMENT">Fulfillment</option>
                    <option value="LINE">Line</option>
                    <option value="SUPERVISORS">Supervisors</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="linear-label">Region</label>
                  <input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="linear-input"
                  />
                </div>

                <div>
                  <label className="linear-label">State</label>
                  <input
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="linear-input"
                  />
                </div>

                <div>
                  <label className="linear-label">FFO</label>
                  <input
                    value={ffo}
                    onChange={(e) => setFfo(e.target.value)}
                    className="linear-input"
                  />
                </div>
              </div>

              <div>
                <label className="linear-label">Address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Metadata or manual address"
                  className="linear-input"
                />
              </div>

              <div>
                <label className="linear-label">GPS</label>
                <input
                  value={gpsText}
                  onChange={(e) => setGpsText(e.target.value)}
                  placeholder="Latitude, Longitude"
                  className="linear-input"
                />
              </div>

              <div>
                <label className="linear-label">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Additional field notes"
                  className="linear-input"
                />
              </div>

              <div className="rounded-[22px] border border-zinc-200 bg-white/70 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-800">Metadata Preview</h3>
                  {extracting ? <span className="text-xs linear-muted">Extracting...</span> : null}
                </div>

                {metadataPreview ? (
                  <div className="space-y-1 text-sm text-zinc-700">
                    <div>
                      <span className="font-medium">Address:</span> {metadataPreview.address || 'Not found'}
                    </div>
                    <div>
                      <span className="font-medium">GPS:</span>{' '}
                      {metadataPreview.gpsText ||
                        (typeof metadataPreview.latitude === 'number' &&
                        typeof metadataPreview.longitude === 'number'
                          ? `${metadataPreview.latitude}, ${metadataPreview.longitude}`
                          : 'Not found')}
                    </div>
                    <div>
                      <span className="font-medium">Captured:</span> {metadataPreview.capturedAt || 'Not found'}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm linear-muted">
                    Select a photo to preview embedded metadata.
                  </p>
                )}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}

              <button type="submit" disabled={submitting} className="linear-button w-full">
                {submitting ? 'Submitting...' : 'Create Submission'}
              </button>
            </form>
          </section>

          <section className="linear-card p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="linear-section-title">Recent submissions</h2>
                <p className="mt-1 text-sm linear-muted">
                  Search by address, GPS, FFO, notes, or technician.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search submissions"
                className="linear-input sm:max-w-sm"
              />
            </div>

            <div className="linear-table-wrap">
              <div className="overflow-x-auto">
                <table className="linear-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Department</th>
                      <th>Address</th>
                      <th>GPS</th>
                      <th>Region</th>
                      <th>State</th>
                      <th>FFO</th>
                      <th>Submitted</th>
                      <th>Technician</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="text-center text-zinc-500">
                          Loading submissions...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center text-zinc-500">
                          No submissions found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((submission) => (
                        <tr key={submission.id}>
                          <td>{typeLabels[submission.type]}</td>
                          <td>{deptLabels[submission.department]}</td>
                          <td>{submission.address || '—'}</td>
                          <td>{submission.gpsText || '—'}</td>
                          <td>{submission.region}</td>
                          <td>{submission.state}</td>
                          <td>{submission.ffo}</td>
                          <td>{new Date(submission.createdAt).toLocaleString()}</td>
                          <td>{submission.submittedBy?.name || submission.submittedBy?.email || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
