'use client';

import { useState, useEffect } from 'react';
import { getSiteSettings, updateSiteSettings } from '@/lib/actions/siteSettings';

export default function AdminSettings() {
  const [notFoundTitle, setNotFoundTitle]     = useState('');
  const [notFoundMessage, setNotFoundMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    getSiteSettings().then(s => {
      setNotFoundTitle(s.notFoundTitle);
      setNotFoundMessage(s.notFoundMessage);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    await updateSiteSettings({ notFoundTitle, notFoundMessage });
    setSaving(false);
    setSavedAt(new Date());
  }

  if (loading) return <p style={{ color: 'var(--as-text-muted)' }}>Loading…</p>;

  return (
    <section className="container admin-content">
      <h1>Site Settings</h1>

      <h2>404 Page</h2>
      <p style={{ color: 'var(--as-text-muted)', fontSize: 'var(--as-text-sm)' }}>
        Shown on both the public site and admin when a page isn't found.
      </p>

      <div className="form-row">
        <label className="form-label" htmlFor="not-found-title">Title</label>
        <input
          id="not-found-title"
          value={notFoundTitle}
          onChange={e => setNotFoundTitle(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="not-found-message">Message</label>
        <textarea
          id="not-found-message"
          value={notFoundMessage}
          onChange={e => setNotFoundMessage(e.target.value)}
          rows={3}
          className="form-input"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={handleSave} disabled={saving} className="btn btn--primary">
          {saving ? 'Saving…' : 'Save'}
        </button>
        {savedAt && !saving && (
          <span style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)' }}>
            Saved {savedAt.toLocaleTimeString()}
          </span>
        )}
      </div>
    </section>
  );
}