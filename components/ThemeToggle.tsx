'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'technician-drop-portal-theme';

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.theme = mode;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('system');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const next = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    setTheme(next);
    applyTheme(next);
  }, []);

  function updateTheme(next: ThemeMode) {
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <div className="theme-toggle">
      <label htmlFor="theme-mode" className="theme-toggle__label">Theme</label>
      <select
        id="theme-mode"
        value={theme}
        onChange={(e) => updateTheme(e.target.value as ThemeMode)}
        className="theme-toggle__select"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}
