'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { useSettings } from '@/lib/SettingsContext';
import { listPages } from '@/lib/actions/pages';

interface PageRecord {
  id: number;
  slug: string;
  title: string;
}

export interface InsertLinkModalProps {
  selectedText: string;
  onInsert: (link: { href: string; text: string; external: boolean; openInNewTab: boolean }) => void;
  onClose: () => void;
}

export default function InsertLinkModal({
  selectedText,
  onInsert,
  onClose,
}: InsertLinkModalProps) {
  const [mode, setMode]               = useState<'external' | 'internal'>('external');
  const [externalUrl, setExternalUrl] = useState('https://');
  const [linkText, setLinkText]       = useState(selectedText);
  const [search, setSearch]           = useState('');
  const [records, setRecords]         = useState<PageRecord[]>([]);
  const [selected, setSelected]       = useState<PageRecord | null>(null);
  const [loading, setLoading]         = useState(false);
  const { externalLinks, internalLinks } = useSettings();

  const urlInputRef    = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'external') urlInputRef.current?.focus();
    else searchInputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'internal') return;
    setLoading(true);
    setSelected(null);
    setSearch('');
    listPages()
      .then(data => setRecords(data as PageRecord[]))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [mode]);

  const filtered = records.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  const canInsert = mode === 'external'
    ? !!externalUrl.trim() && externalUrl !== 'https://'
    : !!selected;

  function handleInsert() {
    if (!canInsert) return;
    // Links silently inherit the global External/Internal Links preference —
    // no per-insert override. Asking again at insertion time would contradict
    // the point of having a global setting.
    const openInNewTab = mode === 'external' ? externalLinks === 'new-tab' : internalLinks === 'new-tab';
    if (mode === 'external') {
      onInsert({ href: externalUrl.trim(), text: linkText, external: true, openInNewTab });
    } else if (selected) {
      onInsert({ href: `/${selected.slug}`, text: linkText || selected.title, external: false, openInNewTab });
    }
  }

  function handleSelectRecord(r: PageRecord) {
    setSelected(r);
    if (!linkText) setLinkText(r.title);
  }

  return (
    <Modal
      title="Insert Link"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="btn btn--ghost">Cancel</button>
          <button onClick={handleInsert} disabled={!canInsert} className="btn btn--primary">
            Insert Link
          </button>
        </>
      }
    >
      {/* Mode toggle */}
      <div className="settings-row__options" style={{ marginBottom: 'var(--as-gap)' }}>
        <button
          className={`settings-option${mode === 'external' ? ' settings-option--active' : ''}`}
          onClick={() => setMode('external')}
        >
          External URL
        </button>
        <button
          className={`settings-option${mode === 'internal' ? ' settings-option--active' : ''}`}
          onClick={() => setMode('internal')}
        >
          AS Pages
        </button>
      </div>

      {mode === 'external' && (
        <>
          <div className="form-row">
            <label className="form-label">URL</label>
            <input
              ref={urlInputRef}
              type="url"
              value={externalUrl}
              onChange={e => setExternalUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleInsert(); }}
              placeholder="https://"
              className="form-input"
            />
          </div>
          <div className="form-row">
            <label className="form-label">Link text</label>
            <input
              type="text"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              placeholder="Display text"
              className="form-input"
            />
          </div>
        </>
      )}

      {mode === 'internal' && (
        <>
          <div className="form-row">
            <input
              ref={searchInputRef}
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pages…"
              className="form-input"
            />
          </div>

          <div style={{ border: '1px solid var(--as-border)', borderRadius: 'var(--as-radius-md)', overflow: 'hidden', maxHeight: '180px', overflowY: 'auto', marginBottom: 'var(--as-gap)' }}>
            {loading ? (
              <p style={{ padding: '16px', color: 'var(--as-text-muted)', fontSize: 'var(--as-text-sm)' }}>Loading…</p>
            ) : filtered.length === 0 ? (
              <p style={{ padding: '16px', color: 'var(--as-text-muted)', fontSize: 'var(--as-text-sm)' }}>No pages found.</p>
            ) : (
              filtered.map(r => {
                const isSelected = selected?.slug === r.slug;
                return (
                  <button
                    key={r.slug}
                    onClick={() => handleSelectRecord(r)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '10px 14px',
                      backgroundColor: isSelected ? 'var(--as-border)' : 'transparent',
                      border: 'none',
                      color: isSelected ? 'var(--as-heading)' : 'var(--as-text)',
                      fontSize: 'var(--as-text-sm)', fontFamily: 'var(--as-font-family)',
                      cursor: 'pointer',
                    }}
                  >
                    {r.title}
                  </button>
                );
              })
            )}
          </div>

          <div className="form-row">
            <label className="form-label">Link text</label>
            <input
              type="text"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              placeholder={selected ? selected.title : 'Display text'}
              className="form-input"
            />
          </div>
        </>
      )}
    </Modal>
  );
}