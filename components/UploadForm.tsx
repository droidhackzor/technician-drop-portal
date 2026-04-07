'use client';

import { useState } from 'react';

type MetadataPreview = {
  latitude?: number;
  longitude?: number;
  address?: string;
  capturedAt?: string;
  source?: string;
};

export function UploadForm() {
  const [submitting, setSubmitting] = useState(false);
  const [metadata, setMetadata] = useState<MetadataPreview | null>(null);

  async function handleFiles(fileList: FileList | null, form: HTMLFormElement) {
    if (!fileList?.length) {
      setMetadata(null);
      return;
    }

    const previewForm = new FormData();
    previewForm.append('photo', fileList[0]);
    const response = await fetch('/api/photos/extract-metadata', {
      method: 'POST',
      body: previewForm,
    });

    if (!response.ok) {
      setMetadata(null);
      return;
    }

    const payload = await response.json();
    setMetadata(payload);

    const latInput = form.elements.namedItem('gpsLat') as HTMLInputElement | null;
    const lngInput = form.elements.namedItem('gpsLng') as HTMLInputElement | null;
    const addressInput = form.elements.namedItem('houseAddress') as HTMLInputElement | null;

    if (latInput && payload.latitude && !latInput.value) latInput.value = String(payload.latitude);
    if (lngInput && payload.longitude && !lngInput.value) lngInput.value = String(payload.longitude);
    if (addressInput && payload.address && !addressInput.value) addressInput.value = payload.address;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSubmitting(true);

    const response = await fetch('/api/submissions', {
      method: 'POST',
      body: formData,
    });

    setSubmitting(false);

    if (response.ok) {
      window.location.href = '/dashboard?success=1';
      return;
    }

    const payload = await response.json().catch(() => ({ error: 'Upload failed' }));
    alert(payload.error || 'Upload failed');
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="file-drop">
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label">Photos</label>
          <input
            className="input"
            name="photos"
            type="file"
            accept="image/*"
            multiple
            required
            onChange={(event) => handleFiles(event.currentTarget.files, event.currentTarget.form!)}
          />
        </div>
        <div className="helper" style={{ marginTop: 10 }}>
          The first image is scanned for EXIF and similar embedded metadata. GPS and address-style text are auto-filled when present.
        </div>
      </div>

      {metadata ? (
        <div className="metadata-strip">
          <strong className="section-title">Detected image metadata</strong>
          <div className="helper">
            {metadata.latitude && metadata.longitude ? `GPS ${metadata.latitude}, ${metadata.longitude}` : 'No GPS found.'}
            {metadata.address ? ` Address: ${metadata.address}.` : ' No address text found.'}
            {metadata.capturedAt ? ` Captured: ${new Date(metadata.capturedAt).toLocaleString()}.` : ''}
          </div>
        </div>
      ) : null}

      <div className="upload-grid">
        <div className="field">
          <label className="label">Incident type</label>
          <select className="select" name="type" defaultValue="CUT_DROP">
            <option value="CUT_DROP">Cut Drop</option>
            <option value="TRAPPED_DROP">Trapped Drop</option>
            <option value="HAZARDOUS_DROP">Hazardous Drop</option>
          </select>
        </div>
        <div className="field">
          <label className="label">Department</label>
          <select className="select" name="department" defaultValue="FULFILLMENT">
            <option value="FULFILLMENT">Fulfillment</option>
            <option value="LINE">Line</option>
            <option value="SUPERVISORS">Supervisors</option>
          </select>
        </div>
      </div>

      <div className="upload-grid">
        <div className="field">
          <label className="label">Region</label>
          <input className="input" name="region" required placeholder="Mountain West" />
        </div>
        <div className="field">
          <label className="label">State</label>
          <input className="input" name="state" required placeholder="Colorado" />
        </div>
      </div>

      <div className="upload-grid">
        <div className="field">
          <label className="label">FFO</label>
          <input className="input" name="ffo" required placeholder="Denver North" />
        </div>
        <div className="field">
          <label className="label">House address</label>
          <input className="input" name="houseAddress" required placeholder="Auto-filled from metadata when available" />
        </div>
      </div>

      <div className="upload-grid">
        <div className="field">
          <label className="label">GPS latitude</label>
          <input className="input" name="gpsLat" type="number" step="0.0000001" placeholder="39.7392" />
        </div>
        <div className="field">
          <label className="label">GPS longitude</label>
          <input className="input" name="gpsLng" type="number" step="0.0000001" placeholder="-104.9903" />
        </div>
      </div>

      <div className="field">
        <label className="label">Notes</label>
        <textarea className="textarea" name="notes" placeholder="Observed issue details" />
      </div>

      <button className="button blue" disabled={submitting} type="submit">
        {submitting ? 'Uploading...' : 'Upload incident'}
      </button>
      <div className="helper">
        Uploads are stored in <code>public/uploads</code> for simple single-host deployment. Metadata JSON is saved in PostgreSQL with the submission record.
      </div>
    </form>
  );
}
