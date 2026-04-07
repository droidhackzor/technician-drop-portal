'use client';

import { useEffect, useMemo, useState } from 'react';

type SubmissionImage = {
  id: string;
  fileName: string;
  publicUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  sortOrder: number;
};

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
  images: SubmissionImage[];
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
  const [previewImage, setPreviewImage] = useState<SubmissionImage | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    <main style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div>
            <div style={styles.badge}>Linear-style field operations</div>
            <h1 style={styles.title}>Technician Drop Portal</h1>
            <p style={styles.subtitle}>
              Submit cut, trapped, and hazardous drop reports with metadata-rich photos.
            </p>
          </div>

          <button onClick={handleLogout} style={styles.secondaryButton}>
            Sign out
          </button>
        </div>

        <div style={styles.grid}>
          <section style={styles.card}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>New submission</h2>
              <p style={styles.sectionText}>
                Add one or more photos and create a new field report.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={styles.formStack}>
              <div style={styles.uploadBox}>
                <label style={styles.label}>Photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleFileChange(e.target.files)}
                  style={styles.input}
                />
                <p style={styles.helperText}>
                  Multiple files supported. Metadata preview uses the first image.
                </p>

                {files.length > 0 && (
                  <div style={styles.innerPanel}>
                    <div style={styles.innerPanelTitle}>
                      {files.length} file(s) selected
                    </div>
                    <ul style={styles.fileList}>
                      {files.map((file) => (
                        <li key={file.name} style={styles.fileItem}>
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label style={styles.label}>Issue Type</label>
                <div style={styles.choiceGrid}>
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setType(option.value)}
                      style={{
                        ...styles.choiceButton,
                        ...(type === option.value
                          ? styles.choiceButtonActive
                          : styles.choiceButtonInactive),
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={styles.label}>Department</label>
                <div style={styles.choiceGrid}>
                  {departmentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDepartment(option.value)}
                      style={{
                        ...styles.choiceButton,
                        ...(department === option.value
                          ? styles.choiceButtonActive
                          : styles.choiceButtonInactive),
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.threeCol}>
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
                <label style={styles.label}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Additional field notes"
                  style={styles.textarea}
                />
              </div>

              <div style={styles.previewPanel}>
                <div style={styles.previewHeader}>
                  <h3 style={styles.previewTitle}>Metadata Preview</h3>
                  {extracting ? <span style={styles.helperText}>Extracting...</span> : null}
                </div>

                {metadataPreview ? (
                  <div style={styles.previewTextBlock}>
                    <div>
                      <strong>Address:</strong> {metadataPreview.address || 'Not found'}
                    </div>
                    <div>
                      <strong>GPS:</strong>{' '}
                      {metadataPreview.gpsText ||
                        (typeof metadataPreview.latitude === 'number' &&
                        typeof metadataPreview.longitude === 'number'
                          ? `${metadataPreview.latitude}, ${metadataPreview.longitude}`
                          : 'Not found')}
                    </div>
                    <div>
                      <strong>Captured:</strong> {metadataPreview.capturedAt || 'Not found'}
                    </div>
                  </div>
                ) : (
                  <p style={styles.sectionText}>
                    Select a photo to preview embedded metadata.
                  </p>
                )}
              </div>

              {error ? <div style={styles.errorBox}>{error}</div> : null}
              {success ? <div style={styles.successBox}>{success}</div> : null}

              <button type="submit" disabled={submitting} style={styles.primaryButton}>
                {submitting ? 'Submitting...' : 'Create Submission'}
              </button>
            </form>
          </section>

          <section style={styles.card}>
            <div style={styles.tableHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Recent submissions</h2>
                <p style={styles.sectionText}>
                  Search by address, GPS, FFO, notes, or technician.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search submissions"
                style={{ ...styles.input, maxWidth: 320 }}
              />
            </div>

            <div style={styles.tableWrap}>
              <div style={styles.tableScroll}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Preview</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Address</th>
                      <th style={styles.th}>GPS</th>
                      <th style={styles.th}>Region</th>
                      <th style={styles.th}>State</th>
                      <th style={styles.th}>FFO</th>
                      <th style={styles.th}>Submitted</th>
                      <th style={styles.th}>Technician</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} style={styles.emptyCell}>
                          Loading submissions...
                        </td>
                      </tr>
                    ) : filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={styles.emptyCell}>
                          No submissions found
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((submission) => {
                        const preview = submission.images?.[0];

                        return (
                          <tr key={submission.id}>
                            <td style={styles.td}>
                              {preview ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(preview)}
                                  style={styles.thumbButton}
                                >
                                  <img
                                    src={preview.publicUrl}
                                    alt={preview.fileName}
                                    style={styles.thumbImage}
                                  />
                                  {submission.images.length > 1 ? (
                                    <span style={styles.thumbCount}>
                                      +{submission.images.length - 1}
                                    </span>
                                  ) : null}
                                </button>
                              ) : (
                                <div style={styles.noThumb}>—</div>
                              )}
                            </td>
                            <td style={styles.td}>{typeLabels[submission.type]}</td>
                            <td style={styles.td}>{departmentLabels[submission.department]}</td>
                            <td style={styles.td}>{submission.address || '—'}</td>
                            <td style={styles.td}>{submission.gpsText || '—'}</td>
                            <td style={styles.td}>{submission.region}</td>
                            <td style={styles.td}>{submission.state}</td>
                            <td style={styles.td}>{submission.ffo}</td>
                            <td style={styles.td}>
                              {new Date(submission.createdAt).toLocaleString()}
                            </td>
                            <td style={styles.td}>
                              {submission.submittedBy?.name ||
                                submission.submittedBy?.email ||
                                '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {previewImage ? (
        <div style={styles.modalBackdrop} onClick={() => setPreviewImage(null)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{previewImage.fileName}</div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={styles.secondaryButton}
              >
                Close
              </button>
            </div>
            <div style={styles.modalImageWrap}>
              <img
                src={previewImage.publicUrl}
                alt={previewImage.fileName}
                style={styles.modalImage}
              />
            </div>
          </div>
        </div>
      ) : null}
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
      <label style={styles.label}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={styles.input}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top, #fbfcfe 0%, #f4f6fb 45%, #edf2f7 100%)',
    color: '#18181b',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '24px 16px 40px',
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: 24,
    marginBottom: 24,
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 28,
    boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
    backdropFilter: 'blur(10px)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    border: '1px solid rgba(15,23,42,0.08)',
    background: '#f8fafc',
    color: '#52525b',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 10px',
    marginBottom: 12,
  },
  title: {
    margin: 0,
    fontSize: 48,
    lineHeight: 1.02,
    letterSpacing: '-0.05em',
    fontWeight: 700,
    color: '#111827',
  },
  subtitle: {
    margin: '10px 0 0',
    color: '#6b7280',
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 14,
    border: '1px solid rgba(15,23,42,0.1)',
    background: '#fff',
    color: '#111827',
    fontSize: 14,
    fontWeight: 600,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '420px minmax(0,1fr)',
    gap: 24,
  },
  card: {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 28,
    boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    fontWeight: 650,
    color: '#111827',
  },
  sectionText: {
    margin: '8px 0 0',
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  formStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  uploadBox: {
    borderRadius: 20,
    border: '1px dashed rgba(15,23,42,0.18)',
    background: '#f8fafc',
    padding: 16,
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
  },
  innerPanel: {
    marginTop: 12,
    background: '#fff',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 16,
    padding: 12,
  },
  innerPanelTitle: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  fileList: {
    margin: 0,
    paddingLeft: 18,
  },
  fileItem: {
    fontSize: 14,
    color: '#52525b',
    lineHeight: 1.5,
  },
  choiceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8,
  },
  choiceButton: {
    borderRadius: 14,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  choiceButtonActive: {
    background: '#111827',
    color: '#fff',
    border: '1px solid #111827',
  },
  choiceButtonInactive: {
    background: '#fff',
    color: '#374151',
    border: '1px solid rgba(15,23,42,0.1)',
  },
  threeCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12,
  },
  input: {
    width: '100%',
    borderRadius: 16,
    border: '1px solid rgba(15,23,42,0.1)',
    background: '#fff',
    color: '#111827',
    fontSize: 14,
    padding: '12px 14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    borderRadius: 16,
    border: '1px solid rgba(15,23,42,0.1)',
    background: '#fff',
    color: '#111827',
    fontSize: 14,
    padding: '12px 14px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: 120,
  },
  previewPanel: {
    borderRadius: 20,
    border: '1px solid rgba(15,23,42,0.08)',
    background: '#f8fafc',
    padding: 16,
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },
  previewTextBlock: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.6,
  },
  errorBox: {
    borderRadius: 16,
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#b91c1c',
    padding: '12px 14px',
    fontSize: 14,
  },
  successBox: {
    borderRadius: 16,
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    color: '#15803d',
    padding: '12px 14px',
    fontSize: 14,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    border: 'none',
    background: '#111827',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    padding: '14px 16px',
    cursor: 'pointer',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  tableWrap: {
    overflow: 'hidden',
    borderRadius: 22,
    border: '1px solid rgba(15,23,42,0.08)',
    background: '#fff',
  },
  tableScroll: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    minWidth: 1100,
    borderCollapse: 'collapse',
  },
  th: {
    background: '#f8fafc',
    borderBottom: '1px solid rgba(15,23,42,0.08)',
    color: '#6b7280',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    textAlign: 'left',
    padding: '14px 16px',
    whiteSpace: 'nowrap',
  },
  td: {
    borderBottom: '1px solid rgba(15,23,42,0.06)',
    color: '#111827',
    fontSize: 14,
    padding: '14px 16px',
    verticalAlign: 'top',
    whiteSpace: 'nowrap',
  },
  emptyCell: {
    padding: '32px 16px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  thumbButton: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid rgba(15,23,42,0.08)',
    background: '#f8fafc',
    cursor: 'pointer',
    padding: 0,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  thumbCount: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    background: 'rgba(17,24,39,0.88)',
    color: '#fff',
    borderRadius: 999,
    padding: '2px 6px',
    fontSize: 11,
    fontWeight: 700,
  },
  noThumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
    border: '1px solid rgba(15,23,42,0.08)',
    background: '#f8fafc',
    display: 'grid',
    placeItems: 'center',
    color: '#9ca3af',
    fontWeight: 700,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 50,
  },
  modalCard: {
    width: 'min(100%, 980px)',
    background: '#fff',
    borderRadius: 24,
    border: '1px solid rgba(15,23,42,0.08)',
    boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderBottom: '1px solid rgba(15,23,42,0.08)',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#111827',
  },
  modalImageWrap: {
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: '80vh',
  },
  modalImage: {
    maxWidth: '100%',
    maxHeight: '80vh',
    objectFit: 'contain',
    display: 'block',
  },
};
