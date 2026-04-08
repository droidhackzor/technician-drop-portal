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
  type: 'CUT_DROP' | 'TRAPPED_DROP' | 'HAZARDOUS_DROP' | 'MDU';
  department: 'FULFILLMENT' | 'LINE' | 'SUPERVISORS';
  region: string;
  state: string;
  ffo: string;
  address?: string | null;
  gpsText?: string | null;
  notes?: string | null;
  status: 'OPEN' | 'COMPLETE' | 'NOT_VALID';
  statusNote?: string | null;
  statusUpdatedAt?: string | null;
  statusUpdatedByName?: string | null;
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

type Viewer = {
  id: string;
  role: string;
  department?: string | null;
  canDelete: boolean;
  canManageAll: boolean;
};

type BuildInfo = {
  branch: string;
  commit: string;
  lastEditedIso: string;
};

const regionOptions = ['Mountain West', 'Front Range', 'Western Slope'];
const stateOptions = ['Colorado', 'Wyoming', 'Utah'];
const ffoOptions = ['Denver North', 'Denver South', 'Boulder', 'Grand Junction'];

const typeOptions = [
  { value: 'CUT_DROP', label: 'Cut Drop' },
  { value: 'TRAPPED_DROP', label: 'Trapped Drop' },
  { value: 'HAZARDOUS_DROP', label: 'Hazardous Drop' },
  { value: 'MDU', label: 'MDU' },
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
  MDU: 'MDU',
};

const departmentLabels: Record<Submission['department'], string> = {
  FULFILLMENT: 'Fulfillment',
  LINE: 'Line',
  SUPERVISORS: 'Supervisors',
};

const statusLabels: Record<Submission['status'], string> = {
  OPEN: 'Open',
  COMPLETE: 'Complete',
  NOT_VALID: 'Not Valid',
};

function timeAgoFromIso(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return 'unknown';

  const diffMs = Date.now() - timestamp;

  if (diffMs < 60_000) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(diffMs / 86_400_000);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(timestamp).toLocaleDateString();
}

export default function DashboardPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<Submission['type']>('CUT_DROP');
  const [department, setDepartment] =
    useState<Submission['department']>('FULFILLMENT');
  const [region, setRegion] = useState(regionOptions[0]);
  const [stateName, setStateName] = useState(stateOptions[0]);
  const [ffo, setFfo] = useState(ffoOptions[0]);
  const [address, setAddress] = useState('');
  const [gpsText, setGpsText] = useState('');
  const [notes, setNotes] = useState('');
  const [metadataPreview, setMetadataPreview] =
    useState<MetadataResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [search, setSearch] = useState('');
  const [previewImage, setPreviewImage] = useState<SubmissionImage | null>(null);

  const [statusModal, setStatusModal] = useState<{
    submission: Submission;
    nextStatus: 'COMPLETE' | 'NOT_VALID' | 'OPEN';
  } | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  const [mobileTab, setMobileTab] = useState<'new' | 'recent'>('new');
  const [isMobile, setIsMobile] = useState(false);

  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const updateIsMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBuildInfo() {
      try {
        const res = await fetch('/api/build-info', { cache: 'no-store' });
        const data = (await res.json()) as BuildInfo;

        if (!cancelled) {
          setBuildInfo(data);
        }
      } catch (err) {
        console.error('Failed to load build info:', err);
      }
    }

    void loadBuildInfo();

    return () => {
      cancelled = true;
    };
  }, []);

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
      setViewer(data?.viewer ?? null);
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
      if (isMobile) setMobileTab('recent');
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

  async function handleDelete(submission: Submission) {
    const confirmed = window.confirm(
      `Delete submission at ${submission.address || submission.gpsText || submission.id}?`
    );
    if (!confirmed) return;

    try {
      setError('');
      setSuccess('');

      const res = await fetch(`/api/submissions/${submission.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete submission');
      }

      setSuccess('Submission deleted.');
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete submission');
    }
  }

  function openStatusModal(
    submission: Submission,
    nextStatus: 'COMPLETE' | 'NOT_VALID' | 'OPEN'
  ) {
    setStatusModal({ submission, nextStatus });
    setStatusNote('');
  }

  async function saveStatus() {
    if (!statusModal) return;

    try {
      setStatusSaving(true);
      setError('');
      setSuccess('');

      const res = await fetch(`/api/submissions/${statusModal.submission.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: statusModal.nextStatus,
          statusNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update submission');
      }

      setSuccess(`Submission marked ${statusLabels[statusModal.nextStatus].toLowerCase()}.`);
      setStatusModal(null);
      setStatusNote('');
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update submission');
    } finally {
      setStatusSaving(false);
    }
  }

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesSelectedFilters =
        submission.region === region &&
        submission.state === stateName &&
        submission.ffo === ffo &&
        submission.department === department &&
        submission.type === type;

      if (!matchesSelectedFilters) return false;

      if (!q) return true;

      const haystack = [
        submission.address,
        submission.gpsText,
        submission.region,
        submission.state,
        submission.ffo,
        submission.notes,
        submission.status,
        submission.statusNote,
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
  }, [search, submissions, region, stateName, ffo, department, type]);

  const technicianNeedsNote =
    statusModal &&
    !viewer?.canManageAll &&
    (statusModal.nextStatus === 'COMPLETE' || statusModal.nextStatus === 'NOT_VALID');

  const showNewSection = !isMobile || mobileTab === 'new';
  const showRecentSection = !isMobile || mobileTab === 'recent';

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.badge}>Field operations</div>
            <h1 style={styles.title}>Technician Drop Portal</h1>
            <p style={styles.subtitle}>
              Submit cut, trapped, hazardous, and MDU reports with metadata-rich photos.
            </p>
          </div>

          <div style={styles.topbarActions}>
            <button onClick={handleLogout} style={styles.secondaryButton}>
              Sign out
            </button>

            <div style={styles.buildInfo}>
              {buildInfo ? (
                <>Build: {buildInfo.branch}-{buildInfo.commit}-{timeAgoFromIso(buildInfo.lastEditedIso)}</>
              ) : (
                <>Build: loading...</>
              )}
            </div>
          </div>
        </div>

        {isMobile ? (
          <div style={styles.mobileTabs}>
            <button
              type="button"
              onClick={() => setMobileTab('new')}
              style={{
                ...styles.mobileTabButton,
                ...(mobileTab === 'new' ? styles.mobileTabActive : styles.mobileTabInactive),
              }}
            >
              New Submission
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('recent')}
              style={{
                ...styles.mobileTabButton,
                ...(mobileTab === 'recent' ? styles.mobileTabActive : styles.mobileTabInactive),
              }}
            >
              Recent Submissions
            </button>
          </div>
        ) : null}

        <div style={isMobile ? styles.gridMobile : styles.gridDesktop}>
          {showNewSection ? (
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
                  <div style={styles.choiceGridDepartment}>
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

                <div style={isMobile ? styles.stackMobile : styles.threeCol}>
                  <SelectField
                    label="Region"
                    value={region}
                    onChange={setRegion}
                    options={regionOptions}
                  />
                  <SelectField
                    label="State"
                    value={stateName}
                    onChange={setStateName}
                    options={stateOptions}
                  />
                  <SelectField
                    label="FFO"
                    value={ffo}
                    onChange={setFfo}
                    options={ffoOptions}
                  />
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
          ) : null}

          {showRecentSection ? (
            <section style={styles.card}>
              <div style={styles.tableHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>Recent submissions</h2>
                  <p style={styles.sectionText}>
                    Showing only {typeLabels[type]} / {departmentLabels[department]} / {region} / {stateName} / {ffo}
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search submissions"
                  style={{ ...styles.input, maxWidth: isMobile ? '100%' : 320 }}
                />
              </div>

              {isMobile ? (
                <div style={styles.mobileSubmissionList}>
                  {loading ? (
                    <div style={styles.mobileEmpty}>Loading submissions...</div>
                  ) : filteredSubmissions.length === 0 ? (
                    <div style={styles.mobileEmpty}>No submissions found</div>
                  ) : (
                    filteredSubmissions.map((submission) => {
                      const preview = submission.images?.[0];

                      return (
                        <div key={submission.id} style={styles.mobileSubmissionCard}>
                          <div style={styles.mobileSubmissionTop}>
                            <div style={styles.mobileThumbWrap}>
                              {preview ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(preview)}
                                  style={styles.thumbButton}
                                >
                                  <img
                                    src={`/api/images/${preview.id}`}
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
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={styles.mobileSubmissionTitle}>
                                {typeLabels[submission.type]}
                              </div>
                              <div style={styles.mobileSubmissionMeta}>
                                {departmentLabels[submission.department]} · {submission.ffo}
                              </div>
                              <div style={styles.mobileSubmissionMeta}>
                                {submission.address || submission.gpsText || 'No location'}
                              </div>
                            </div>

                            <span
                              style={{
                                ...styles.statusPill,
                                ...(submission.status === 'OPEN'
                                  ? styles.statusOpen
                                  : submission.status === 'COMPLETE'
                                  ? styles.statusComplete
                                  : styles.statusInvalid),
                              }}
                            >
                              {statusLabels[submission.status]}
                            </span>
                          </div>

                          {submission.statusNote ? (
                            <div style={styles.mobileStatusNote}>{submission.statusNote}</div>
                          ) : null}

                          <div style={styles.mobileSubmissionMeta}>
                            {new Date(submission.createdAt).toLocaleString()}
                          </div>
                          <div style={styles.mobileSubmissionMeta}>
                            {submission.submittedBy?.name ||
                              submission.submittedBy?.email ||
                              '—'}
                          </div>

                          <div style={styles.mobileActions}>
                            <button
                              type="button"
                              onClick={() => openStatusModal(submission, 'COMPLETE')}
                              style={styles.smallButton}
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              onClick={() => openStatusModal(submission, 'NOT_VALID')}
                              style={styles.smallButton}
                            >
                              Not Valid
                            </button>
                            {viewer?.canManageAll ? (
                              <button
                                type="button"
                                onClick={() => openStatusModal(submission, 'OPEN')}
                                style={styles.smallButton}
                              >
                                Reopen
                              </button>
                            ) : null}
                            {viewer?.canDelete ? (
                              <button
                                type="button"
                                onClick={() => void handleDelete(submission)}
                                style={styles.deleteButton}
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <div style={styles.tableScroll}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Preview</th>
                          <th style={styles.th}>Type</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Department</th>
                          <th style={styles.th}>Address</th>
                          <th style={styles.th}>GPS</th>
                          <th style={styles.th}>Region</th>
                          <th style={styles.th}>State</th>
                          <th style={styles.th}>FFO</th>
                          <th style={styles.th}>Submitted</th>
                          <th style={styles.th}>Technician</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={12} style={styles.emptyCell}>
                              Loading submissions...
                            </td>
                          </tr>
                        ) : filteredSubmissions.length === 0 ? (
                          <tr>
                            <td colSpan={12} style={styles.emptyCell}>
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
                                        src={`/api/images/${preview.id}`}
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
                                <td style={styles.td}>
                                  <span
                                    style={{
                                      ...styles.statusPill,
                                      ...(submission.status === 'OPEN'
                                        ? styles.statusOpen
                                        : submission.status === 'COMPLETE'
                                        ? styles.statusComplete
                                        : styles.statusInvalid),
                                    }}
                                  >
                                    {statusLabels[submission.status]}
                                  </span>
                                  {submission.statusNote ? (
                                    <div style={styles.statusNote}>{submission.statusNote}</div>
                                  ) : null}
                                </td>
                                <td style={styles.td}>
                                  {departmentLabels[submission.department]}
                                </td>
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
                                <td style={styles.td}>
                                  <div style={styles.actionStack}>
                                    <button
                                      type="button"
                                      onClick={() => openStatusModal(submission, 'COMPLETE')}
                                      style={styles.smallButton}
                                    >
                                      Complete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openStatusModal(submission, 'NOT_VALID')}
                                      style={styles.smallButton}
                                    >
                                      Not Valid
                                    </button>

                                    {viewer?.canManageAll ? (
                                      <button
                                        type="button"
                                        onClick={() => openStatusModal(submission, 'OPEN')}
                                        style={styles.smallButton}
                                      >
                                        Reopen
                                      </button>
                                    ) : null}

                                    {viewer?.canDelete ? (
                                      <button
                                        type="button"
                                        onClick={() => void handleDelete(submission)}
                                        style={styles.deleteButton}
                                      >
                                        Delete
                                      </button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ) : null}
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
                src={`/api/images/${previewImage.id}`}
                alt={previewImage.fileName}
                style={styles.modalImage}
              />
            </div>
          </div>
        </div>
      ) : null}

      {statusModal ? (
        <div style={styles.modalBackdrop} onClick={() => setStatusModal(null)}>
          <div style={styles.statusModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                Mark submission {statusLabels[statusModal.nextStatus].toLowerCase()}
              </div>
              <button
                type="button"
                onClick={() => setStatusModal(null)}
                style={styles.secondaryButton}
              >
                Cancel
              </button>
            </div>

            <div style={styles.statusModalBody}>
              <p style={styles.sectionText}>
                {technicianNeedsNote
                  ? 'Technician action requires field notes.'
                  : 'Add notes if needed, then save the status change.'}
              </p>

              <label style={styles.label}>Field Notes</label>
              <textarea
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                rows={5}
                placeholder="Enter field notes for this status update"
                style={styles.textarea}
              />

              <button
                type="button"
                onClick={() => void saveStatus()}
                disabled={statusSaving}
                style={styles.primaryButton}
              >
                {statusSaving ? 'Saving...' : 'Save Status'}
              </button>
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label style={styles.label}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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
    maxWidth: 1380,
    margin: '0 auto',
    padding: '24px 16px 40px',
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: 24,
    marginBottom: 16,
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 28,
    boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
    backdropFilter: 'blur(10px)',
    flexWrap: 'wrap',
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
  topbarActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10,
    minWidth: 180,
  },
  buildInfo: {
    fontSize: 12,
    lineHeight: 1.5,
    color: '#6b7280',
    textAlign: 'right',
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
  mobileTabs: {
    display: 'flex',
    marginBottom: 16,
    background: 'rgba(255,255,255,0.88)',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 18,
    padding: 6,
    gap: 6,
  },
  mobileTabButton: {
    flex: 1,
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
  },
  mobileTabActive: {
    background: '#111827',
    color: '#fff',
  },
  mobileTabInactive: {
    background: 'transparent',
    color: '#4b5563',
  },
  gridDesktop: {
    display: 'grid',
    gridTemplateColumns: '420px minmax(0,1fr)',
    gap: 24,
    alignItems: 'start',
  },
  gridMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 28,
    boxShadow: '0 10px 30px rgba(15,23,42,0.06)',
    padding: 20,
    minWidth: 0,
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
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: 8,
  },
  choiceGridDepartment: {
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
  stackMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
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
    flexWrap: 'wrap',
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
    minWidth: 1400,
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
    flexShrink: 0,
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
    flexShrink: 0,
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
    flexWrap: 'wrap',
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
  statusModalCard: {
    width: 'min(100%, 560px)',
    background: '#fff',
    borderRadius: 24,
    border: '1px solid rgba(15,23,42,0.08)',
    boxShadow: '0 20px 60px rgba(15,23,42,0.25)',
    overflow: 'hidden',
  },
  statusModalBody: {
    padding: 16,
    display: 'grid',
    gap: 14,
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 12,
    fontWeight: 700,
  },
  statusOpen: {
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  statusComplete: {
    background: '#f0fdf4',
    color: '#15803d',
  },
  statusInvalid: {
    background: '#fef2f2',
    color: '#b91c1c',
  },
  statusNote: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    whiteSpace: 'normal',
    lineHeight: 1.45,
    maxWidth: 220,
  },
  actionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  smallButton: {
    borderRadius: 12,
    border: '1px solid rgba(15,23,42,0.1)',
    background: '#fff',
    color: '#111827',
    fontSize: 12,
    fontWeight: 700,
    padding: '8px 10px',
    cursor: 'pointer',
  },
  deleteButton: {
    borderRadius: 12,
    border: '1px solid #fecaca',
    background: '#fff5f5',
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: 700,
    padding: '8px 10px',
    cursor: 'pointer',
  },
  mobileSubmissionList: {
    display: 'grid',
    gap: 12,
  },
  mobileSubmissionCard: {
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 18,
    background: '#fff',
    padding: 14,
    display: 'grid',
    gap: 10,
  },
  mobileSubmissionTop: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  mobileThumbWrap: {
    flexShrink: 0,
  },
  mobileSubmissionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#111827',
    lineHeight: 1.2,
    marginBottom: 4,
  },
  mobileSubmissionMeta: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.4,
    marginTop: 2,
  },
  mobileStatusNote: {
    fontSize: 13,
    color: '#4b5563',
    background: '#f8fafc',
    borderRadius: 12,
    padding: '10px 12px',
    whiteSpace: 'normal',
    lineHeight: 1.45,
  },
  mobileActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  mobileEmpty: {
    border: '1px solid rgba(15,23,42,0.08)',
    borderRadius: 18,
    background: '#fff',
    padding: 20,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
};
