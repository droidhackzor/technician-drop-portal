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
  raw?: Record<string, unknown>;
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
      const res = await fetch('/api/submissions', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load submissions');
      }
      const data = await res.json();
      setSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
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

      if (!res.ok) {
        throw new Error('Failed to extract metadata');
      }

      const data: MetadataResponse = await res.json();
      setMetadataPreview(data);

      if (data.address) {
        setAddress(data.address);
      }
      if (data.gpsText) {
        setGpsText(data.gpsText);
      } else if (
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number'
      ) {
        setGpsText(`${data.latitude}, ${data.longitude}`);
      }
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
      setType('CUT_DROP');
      setDepartment('FULFILLMENT');
      setRegion('Mountain West');
      setStateName('Colorado');
      setFfo('Denver North');
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
    <main className="min-h-screen bg-[#f7f8fb] text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-start justify-between gap-4 rounded-3xl border border-zinc-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Technician Drop Portal</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Upload field photos, extract metadata, and review submissions by newest first
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Sign out
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold tracking-tight">New Submission</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Upload one or more photos and submit a new issue report
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
                <label className="mb-2 block text-sm font-medium">Photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleFileChange(e.target.files)}
                  className="block w-full text-sm"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Multiple files supported. First image is used for metadata preview.
                </p>

                {files.length > 0 && (
                  <div className="mt-3 rounded-xl bg-white p-3 text-sm text-zinc-700">
                    {files.length} file(s) selected:
                    <ul className="mt-2 space-y-1">
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
                  <label className="mb-1 block text-sm font-medium">Issue Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Submission['type'])}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  >
                    <option value="CUT_DROP">Cut Drop</option>
                    <option value="TRAPPED_DROP">Trapped Drop</option>
                    <option value="HAZARDOUS_DROP">Hazardous Drop</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Submission['department'])}
                    className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2"
                  >
                    <option value="FULFILLMENT">Fulfillment</option>
                    <option value="LINE">Line</option>
                    <option value="SUPERVISORS">Supervisors</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Region</label>
                  <input
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">State</label>
                  <input
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">FFO</label>
                  <input
                    value={ffo}
                    onChange={(e) => setFfo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Metadata or manual address"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">GPS</label>
                <input
                  value={gpsText}
                  onChange={(e) => setGpsText(e.target.value)}
                  placeholder="Lat, Long"
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                  placeholder="Add any field notes"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Metadata Preview</h3>
                  {extracting ? (
                    <span className="text-xs text-zinc-500">Extracting...</span>
                  ) : null}
                </div>

                {metadataPreview ? (
                  <div className="space-y-1 text-sm text-zinc-700">
                    <div>
                      <span className="font-medium">Address:</span>{' '}
                      {metadataPreview.address || 'Not found'}
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
                      <span className="font-medium">Captured:</span>{' '}
                      {metadataPreview.capturedAt || 'Not found'}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Select a photo to preview embedded metadata.
                  </p>
                )}
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Create Submission'}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Recent Submissions</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Searchable submissions sorted by newest first
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search address, GPS, FFO, notes, technician"
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 sm:max-w-sm"
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-zinc-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Department</th>
                      <th className="px-4 py-3 font-medium">Address</th>
                      <th className="px-4 py-3 font-medium">GPS</th>
                      <th className="px-4 py-3 font-medium">Region</th>
                      <th className="px-4 py-3 font-medium">State</th>
                      <th className="px-4 py-3 font-medium">FFO</th>
                      <th className="px-4 py-3 font-medium">Submitted</th>
                      <th className="px-4 py-3 font-medium">Technician</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                          Loading submissions...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                          No submissions found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((submission) => (
                        <tr key={submission.id} className="align-top">
                          <td className="px-4 py-3">{typeLabels[submission.type]}</td>
                          <td className="px-4 py-3">{deptLabels[submission.department]}</td>
                          <td className="px-4 py-3">{submission.address || '—'}</td>
                          <td className="px-4 py-3">{submission.gpsText || '—'}</td>
                          <td className="px-4 py-3">{submission.region}</td>
                          <td className="px-4 py-3">{submission.state}</td>
                          <td className="px-4 py-3">{submission.ffo}</td>
                          <td className="px-4 py-3">
                            {new Date(submission.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {submission.submittedBy?.name ||
                              submission.submittedBy?.email ||
                              '—'}
                          </td>
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
