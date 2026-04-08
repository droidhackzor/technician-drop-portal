'use client';

import { useEffect, useMemo, useState } from 'react';
import { BUILD_INFO } from '@/lib/build-info';

function timeAgoFromEpoch(epochSeconds: number) {
  const now = Date.now();
  const diffMs = now - epochSeconds * 1000;

  if (diffMs < 60_000) return 'just now';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(diffMs / 86_400_000);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/* ---------- CONFIG ---------- */

const regionOptions = ['Mountain West', 'Front Range', 'Western Slope'];
const stateOptions = ['Colorado', 'Wyoming', 'Utah'];
const ffoOptions = ['Denver North', 'Denver South', 'Boulder', 'Grand Junction'];

/* ---------- TYPES ---------- */

type Submission = any;

/* ---------- COMPONENT ---------- */

export default function DashboardPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [region, setRegion] = useState(regionOptions[0]);
  const [stateName, setStateName] = useState(stateOptions[0]);
  const [ffo, setFfo] = useState(ffoOptions[0]);
  const [department, setDepartment] = useState('FULFILLMENT');
  const [type, setType] = useState('CUT_DROP');

  const [mobileTab, setMobileTab] = useState<'new' | 'recent'>('new');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 900);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/submissions');
    const data = await res.json();
    setSubmissions(data.submissions || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (
        s.region !== region ||
        s.state !== stateName ||
        s.ffo !== ffo ||
        s.department !== department ||
        s.type !== type
      )
        return false;

      if (!search) return true;

      return JSON.stringify(s).toLowerCase().includes(search.toLowerCase());
    });
  }, [submissions, search, region, stateName, ffo, department, type]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/login';
  }

  return (
    <div style={styles.page}>
      <div style={styles.topbar}>
        <div>
          <div style={styles.badge}>Field operations</div>
          <h1 style={styles.title}>Technician Drop Portal</h1>
        </div>

        <div style={styles.topbarActions}>
          <button onClick={logout} style={styles.secondaryButton}>
            Sign out
          </button>

          <div style={styles.buildInfo}>
            Build: {BUILD_INFO.branch}-{BUILD_INFO.commit}-
            {timeAgoFromEpoch(BUILD_INFO.lastEditedEpoch)}
          </div>
        </div>
      </div>

      {isMobile && (
        <div style={styles.tabs}>
          <button onClick={() => setMobileTab('new')}>New</button>
          <button onClick={() => setMobileTab('recent')}>Recent</button>
        </div>
      )}

      {(!isMobile || mobileTab === 'new') && (
        <div style={styles.card}>
          <h2>New Submission</h2>

          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {regionOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          <select value={stateName} onChange={(e) => setStateName(e.target.value)}>
            {stateOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>

          <select value={ffo} onChange={(e) => setFfo(e.target.value)}>
            {ffoOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      )}

      {(!isMobile || mobileTab === 'recent') && (
        <div style={styles.card}>
          <h2>Recent Submissions</h2>

          <input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <div>Loading...</div>
          ) : filtered.length === 0 ? (
            <div>No results</div>
          ) : (
            filtered.map((s) => (
              <div key={s.id} style={styles.item}>
                <div>{s.type}</div>
                <div>{s.address}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- STYLES ---------- */

const styles: any = {
  page: {
    padding: 20,
    fontFamily: 'Inter, sans-serif',
  },
  topbar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  badge: {
    fontSize: 12,
    color: '#666',
  },
  title: {
    fontSize: 28,
  },
  topbarActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  buildInfo: {
    fontSize: 12,
    color: '#666',
  },
  secondaryButton: {
    padding: '8px 12px',
  },
  card: {
    border: '1px solid #ddd',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  item: {
    padding: 8,
    borderBottom: '1px solid #eee',
  },
  tabs: {
    display: 'flex',
    gap: 10,
    marginBottom: 10,
  },
};
