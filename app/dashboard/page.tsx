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

const typeOptions = [
  { value: 'CUT_DROP', label: 'Cut Drop' },
  { value: 'TRAPPED_DROP', label: 'Trapped Drop' },
  { value: 'HAZARDOUS_DROP', label: 'Hazardous Drop' },
] as const;

const departmentOptions = [
  { value: 'FULFILLMENT', label: 'Fulfillment' },
  { value: 'LINE', label: 'Line' },
  { value: 'SUPERVISORS', label: 'Supervisors' },
] as const;

const typeLabels: Record<Submission['type'], string> = {
  CUT_DROP: 'Cut Drop',
  TRAPPED_DROP: 'Trapped Drop',
  HAZARDOUS_DROP: 'Hazardous Drop',
};

const departmentLabels: Record<Submission['department'], string> = {
  FULFILLMENT: 'Fulfillment',
  LINE: 'Line',
  SUPERVISORS: 'Supervisors',
};

export default function DashboardPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<Submission['type']>('CUT_DROP');
  const [department, setDepartment] =
    useState<Submission['department']>('FULFILLMENT');
  const [region, setRegion] = useState('Mountain West');
  const [stateName, setStateName] = useState('Colorado');
  const [ffo, setFfo] = useState('Denver North');
  const [address, setAddress] = useState('');
  const [gpsText, setGpsText] = useState('');
  const [notes, setNotes] = useState('');
  const [metadataPreview, setMetadataPreview] =
    useState<MetadataResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [search, setSearch] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadSubmissions() {
    try {
      setLoading(true);
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

      const meta = data as MetadataResponse;
      setMetadataPreview(meta);

      if (meta.address) setAddress(meta.address);

      const gps =
        meta.gpsText ||
        (typeof meta.latitude === 'number' && typeof meta.longitude === 'number'
          ? `${meta.latitude}, ${meta.longitude}`
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

    if (selected.length > 0) {
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
      setError('Please upload at least one photo.');
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

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return submissions;

    return submissions.filter((submission) => {
      const haystack = [
        submission.address,
        submission.gpsText,
        submission.region,
        submission.state,
        submission.ffo,
        submission.notes,
        submission.submittedBy?.name,
        submission.submittedBy?.email,
        typeLabels[submission.type],
        departmentLabels[submission.department],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [search, submissions]);

  return (
    <main className="min-h-screen bg-[#f4f5f8] text-zinc-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-[28px] border border-zinc-200 bg-white px-6 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                Linear-style field operations
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950">
                Technician Drop Portal
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Submit cut, trapped, and hazardous drop reports with metadata-rich photos.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-5">
              <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                New submission
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Add one or more photos and create a new field report.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Photos
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleFileChange(e.target.files)}
                  className="block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Multiple files supported. Metadata preview uses the first image.
                </p>

                {files.length > 0 && (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="mb-2 text-sm font-medium text-zinc-800">
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

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Issue Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        type === option.value
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Department
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {departmentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDepartment(option.value)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        department === option.value
                          ? 'border-zinc-900 bg-zinc-900 text-white'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Region" value={region} onChange={setRegion} />
                <Field label="State" value={stateName} onChange={setStateName} />
                <Field label="FFO" value={ffo} onChange={setFfo} />
              </div>

              <Field
                label="Address"
                value={address}
                onChange={setAddress}
                placeholder="Metadata or manual address"
              />

              <Field
                label="GPS"
                value={gpsText}
                onChange={setGpsText}
                placeholder="Latitude, Longitude"
              />

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Additional field notes"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900">Metadata Preview</h3>
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
                <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Create Submission'}
              </button>
            </form>
          </section>

          <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                  Recent submissions
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Search by address, GPS, FFO, notes, or technician.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search submissions"
                className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 sm:max-w-sm"
              />
            </div>

            <div className="overflow-hidden rounded-[22px] border border-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-zinc-50">
                    <tr className="text-left">
                      {[
                        'Type',
                        'Department',
                        'Address',
                        'GPS',
                        'Region',
                        'State',
                        'FFO',
                        'Submitted',
                        'Technician',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="border-b border-zinc-200 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-zinc-500"
                        >
                          Loading submissions...
                        </td>
                      </tr>
                    ) : filteredSubmissions.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-10 text-center text-sm text-zinc-500"
                        >
                          No submissions found
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((submission) => (
                        <tr key={submission.id} className="hover:bg-zinc-50">
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
                            {typeLabels[submission.type]}
                          </td>
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
                            {departmentLabels[submission.department]}
                          </td>
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
                            {submission.address || '—'}
                          </td>
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
                            {submission.gpsText || '—'}
                          </td>
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
                            {submission.region}
                          </td>
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
                            {submission.state}
                          </td>
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
                            {submission.ffo}
                          </td>
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
                            {new Date(submission.createdAt).toLocaleString()}
                          </td>
                          <td className="border-b border-zinc-100 px-4 py-4 text-sm text-zinc-900">
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

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
      />
    </div>
  );
}
