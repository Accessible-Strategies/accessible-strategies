'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useEscapeKey } from '@/lib/hooks/useEscapeKey';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────

export interface MediaItem {
  slug:       string;
  folder:     string;
  alt:        string;
  caption?:   string;
  credit?:    string;
  creditUrl?: string;
  uploadedAt: string;
  width:      number;
  height:     number;
  urls?: {
    fullJpg:    string;
    fullWebp:   string;
    squareJpg:  string;
    squareWebp: string;
  };
}

type GridSize = 'small' | 'medium' | 'large';

export interface MediaBrowserProps {
  mode: 'insert' | 'select';
  multiple?: boolean;
  defaultFolder?: string;
  onSelect?: (item: MediaItem) => void;
  onSelectMultiple?: (items: MediaItem[]) => void;
  onClose: () => void;
  standalone?: boolean;
}

interface UploadQueueItem {
  id: string;
  file: File;
  preview: string;
  filename: string;
  filenameEdited: boolean;
  alt: string;
  caption: string;
  credit: string;
  creditUrl: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

const FOLDERS = ['general', 'social'];
const GRID_COLS: Record<GridSize, number> = { small: 6, medium: 4, large: 3 };
const LS_GRID_SIZE = 'as:media:gridSize';

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

function writeLS<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function MediaBrowser(props: MediaBrowserProps) {
  const {
    mode,
    multiple = false,
    defaultFolder = 'general',
    onSelect,
    onSelectMultiple,
    onClose,
    standalone = false,
  } = props;

  const [items, setItems]         = useState<MediaItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [folder, setFolder]       = useState(defaultFolder);
  const [gridSize, setGridSize]   = useState<GridSize>('medium');
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [showUpload, setShowUpload] = useState(false);
  const [editTarget, setEditTarget] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setGridSize(readLS(LS_GRID_SIZE, 'medium' as GridSize));
  }, []);

  useEscapeKey(onClose, !standalone && !showUpload && !editTarget);

  const loadMedia = useCallback(() => {
    setLoading(true);
    fetch(`/api/media/list?folder=${encodeURIComponent(folder)}`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Failed to load media.'); setLoading(false); });
  }, [folder]);

  useEffect(() => { if (mounted) loadMedia(); }, [loadMedia, mounted]);
  useEffect(() => { if (mounted) writeLS(LS_GRID_SIZE, gridSize); }, [gridSize, mounted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.slug.toLowerCase().includes(q) || i.alt.toLowerCase().includes(q));
  }, [items, search]);

  function handleItemClick(item: MediaItem) {
    if (multiple) {
      setSelectedSlugs(prev => {
        const next = new Set(prev);
        next.has(item.slug) ? next.delete(item.slug) : next.add(item.slug);
        return next;
      });
    } else {
      onSelect?.(item);
      onClose();
    }
  }

  function confirmMultiple() {
    const selected = items.filter(i => selectedSlugs.has(i.slug));
    onSelectMultiple?.(selected);
    onClose();
  }

  async function handleDelete(item: MediaItem) {
    const res = await fetch('/api/media/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: item.folder, slug: item.slug }),
    });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.slug !== item.slug));
    } else {
      alert('Failed to delete image.');
    }
    setDeleteTarget(null);
  }

  if (!mounted) return null;

  // ─── Shared toolbar + grid content ─────────────────────────────────────
  const content = (
    <>
      <div className="media-browser__toolbar">
        <input
          type="search"
          placeholder="Search filename or alt text…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="media-browser__search"
        />
        <select
          value={folder}
          onChange={e => setFolder(e.target.value)}
          aria-label="Folder"
          className="media-browser__folder-select"
        >
          {FOLDERS.map(f => (
            <option key={f} value={f}>{f[0].toUpperCase()}{f.slice(1)}</option>
          ))}
        </select>
        <div role="radiogroup" aria-label="Grid size" style={{ display: 'flex', gap: '2px' }}>
          {(['small', 'medium', 'large'] as GridSize[]).map(size => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={gridSize === size}
              onClick={() => setGridSize(size)}
              title={`${size[0].toUpperCase()}${size.slice(1)} grid`}
              className={gridSize === size ? 'icon-hover settings-option--active' : 'icon-hover'}
            >
              {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowUpload(true)} className="btn btn--primary">
          + Upload
        </button>
      </div>

      <div className="media-browser__grid-wrap">
        {loading ? (
          <p style={{ color: 'var(--as-text-muted)', fontSize: 'var(--as-text-sm)' }}>Loading…</p>
        ) : error ? (
          <p style={{ color: 'var(--as-error)', fontSize: 'var(--as-text-sm)' }}>{error}</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--as-text-muted)', fontSize: 'var(--as-text-sm)' }}>
            {search ? `No images match "${search}"` : 'No images in this folder yet.'}
          </p>
        ) : (
          <div className="media-browser__grid" style={{ gridTemplateColumns: `repeat(${GRID_COLS[gridSize]}, 1fr)` }}>
            {filtered.map(item => {
              const isSelected = selectedSlugs.has(item.slug);
              const missingAlt = !item.alt?.trim();
              return (
                <div key={item.slug} className={isSelected ? 'media-card media-card--selected' : 'media-card'}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    aria-label={multiple ? `Select ${item.alt}` : `Insert ${item.alt}`}
                    aria-pressed={multiple ? isSelected : undefined}
                    className="media-card__thumb-btn"
                  >
                    <div className="media-card__thumb" style={{ backgroundImage: `url(${item.urls?.squareJpg})` }} />
                  </button>

                  {multiple && (
                    <div className={isSelected ? 'media-card__checkbox media-card__checkbox--checked' : 'media-card__checkbox'}>
                      {isSelected && '✓'}
                    </div>
                  )}

                  {missingAlt && <div className="media-card__alt-badge">ALT</div>}

                  <div className="media-card__footer">
                    <span className="media-card__filename">{item.slug}</span>
                    <button type="button" onClick={() => setEditTarget(item)} aria-label={`Edit ${item.alt}`} title="Edit" className="media-card__action">✎</button>
                    <button type="button" onClick={() => setDeleteTarget(item)} aria-label={`Delete ${item.alt}`} title="Delete" className="media-card__action">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  const dialogs = (
    <>
      {showUpload && (
        <UploadDialog
          folder={folder}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadMedia(); }}
        />
      )}
      {editTarget && (
        <EditMetadataDialog
          item={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); loadMedia(); }}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Image?"
          message={`Delete "${deleteTarget.alt}"? This can\u2019t be undone.`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );

  // ─── Standalone mode — no Modal wrapper, renders inline ────────────────
  if (standalone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--as-gap)' }}>
        {content}
        {dialogs}
      </div>
    );
  }

  // ─── Picker mode — same Modal component every other dialog uses ───────
  return (
    <>
      <Modal
        title="Media Browser"
        onClose={onClose}
        maxWidth="900px"
        maximizable
        persistKey="media-browser"
        footer={multiple ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--as-text-sm)', color: 'var(--as-text-muted)' }}>
              {selectedSlugs.size} selected
            </span>
            <button type="button" onClick={confirmMultiple} disabled={selectedSlugs.size === 0} className="btn btn--primary">
              Add {selectedSlugs.size || ''} {selectedSlugs.size === 1 ? 'Image' : 'Images'}
            </button>
          </div>
        ) : undefined}
      >
        {content}
      </Modal>
      {dialogs}
    </>
  );
}

// ─── Upload Dialog ────────────────────────────────────────────────────────

function UploadDialog({
  folder,
  onClose,
  onUploaded,
}: {
  folder: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [sharedCredit, setSharedCredit] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newItems: UploadQueueItem[] = arr.map(file => ({
      id: genId(),
      file,
      preview: URL.createObjectURL(file),
      filename: '',
      filenameEdited: false,
      alt: '',
      caption: '',
      credit: '',
      creditUrl: '',
      status: 'pending',
    }));
    setQueue(prev => [...prev, ...newItems]);
  }

  function updateItem(id: string, patch: Partial<UploadQueueItem>) {
    setQueue(prev => prev.map(i => {
      if (i.id !== id) return i;
      const next = { ...i, ...patch };
      if ('alt' in patch && !next.filenameEdited) {
        next.filename = slugify(next.alt);
      }
      if ('filename' in patch) {
        next.filenameEdited = true;
      }
      return next;
    }));
  }

  function removeItem(id: string) {
    setQueue(prev => prev.filter(i => i.id !== id));
  }

  function applyCreditToAll() {
    setQueue(prev => prev.map(i => ({ ...i, credit: sharedCredit })));
  }

  const allHaveAlt = queue.length > 0 && queue.every(i => i.alt.trim());

  async function handleUploadAll() {
    if (!allHaveAlt) return;
    setUploading(true);

    for (const item of queue) {
      if (item.status === 'done') continue;
      updateItem(item.id, { status: 'uploading' });
      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('alt', item.alt);
        formData.append('folder', folder);
        if (item.filename.trim()) formData.append('slug', item.filename.trim());
        if (item.caption)   formData.append('caption', item.caption);
        if (item.credit)    formData.append('credit', item.credit);
        if (item.creditUrl) formData.append('creditUrl', item.creditUrl);

        const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        updateItem(item.id, { status: 'done' });
      } catch {
        updateItem(item.id, { status: 'error', error: 'Upload failed' });
      }
    }

    setUploading(false);
    setQueue(prev => {
      const stillFailing = prev.some(i => i.status === 'error');
      if (!stillFailing) onUploaded();
      return prev;
    });
  }

  return (
    <Modal
      onClose={onClose}
      title="Upload Images"
      closeDisabled={uploading}
      isDirty={queue.length > 0 && !queue.every(i => i.status === 'done')}
      footer={
        <>
          <span style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', marginRight: 'auto', alignSelf: 'center' }}>
            {queue.length} {queue.length === 1 ? 'image' : 'images'} queued
          </span>
          <button
            type="button"
            onClick={handleUploadAll}
            disabled={!allHaveAlt || uploading || queue.length === 0}
            className="btn btn--primary"
          >
            {uploading ? 'Uploading…' : 'Upload All'}
          </button>
        </>
      }
    >
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        className={dragOver ? 'upload-dropzone upload-dropzone--active' : 'upload-dropzone'}
      >
        <label>
          <input
            type="file" multiple accept="image/*"
            onChange={e => e.target.files && addFiles(e.target.files)}
            className="sr-only"
          />
          <span style={{ fontSize: 'var(--as-text-sm)', color: 'var(--as-text)' }}>
            Drag images here, or <span className="upload-dropzone__browse">browse</span>
          </span>
        </label>
      </div>

      {queue.length > 1 && (
        <div className="upload-shared-credit">
          <input
            type="text" placeholder="Shared credit (optional)…"
            value={sharedCredit}
            onChange={e => setSharedCredit(e.target.value)}
            className="form-input"
          />
          <button type="button" onClick={applyCreditToAll} disabled={!sharedCredit.trim()} className="btn btn--ghost">
            Apply to All
          </button>
        </div>
      )}

      {queue.map(item => (
        <div key={item.id} className="upload-queue-item">
          <img src={item.preview} alt="" className="upload-queue-item__preview" />
          <div className="upload-queue-item__fields">
            <input
              type="text"
              placeholder="Filename…"
              value={item.filename}
              onChange={e => updateItem(item.id, { filename: slugify(e.target.value) })}
              disabled={item.status === 'uploading' || item.status === 'done'}
              className="upload-input-sm upload-input-sm--mono"
            />
            <input
              type="text"
              placeholder="Alt text (required)…"
              value={item.alt}
              onChange={e => updateItem(item.id, { alt: e.target.value })}
              disabled={item.status === 'uploading' || item.status === 'done'}
              className={!item.alt.trim() ? 'upload-input-sm upload-input-sm--invalid' : 'upload-input-sm'}
              style={{ height: '36px' }}
            />
            {item.alt.trim().length > 125 && (
              <span style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-warning)' }}>
                {item.alt.trim().length} characters — concise alt text communicates better and is less overwhelming for screen reader users.
              </span>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text" placeholder="Caption (optional)"
                value={item.caption}
                onChange={e => updateItem(item.id, { caption: e.target.value })}
                disabled={item.status === 'uploading' || item.status === 'done'}
                className="upload-input-sm"
                style={{ flex: 1 }}
              />
              <input
                type="text" placeholder="Credit (optional)"
                value={item.credit}
                onChange={e => updateItem(item.id, { credit: e.target.value })}
                disabled={item.status === 'uploading' || item.status === 'done'}
                className="upload-input-sm"
                style={{ flex: 1 }}
              />
            </div>
            {item.status === 'error' && (
              <span style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-error)' }}>{item.error}</span>
            )}
          </div>
          <div className="upload-queue-item__status-col">
            <span className={`upload-queue-item__status upload-queue-item__status--${item.status}`}>
              {item.status === 'pending' ? 'Pending'
                : item.status === 'uploading' ? 'Uploading…'
                : item.status === 'done' ? '✓ Done'
                : '✕ Failed'}
            </span>
            {item.status !== 'uploading' && item.status !== 'done' && (
              <button type="button" onClick={() => removeItem(item.id)} aria-label="Remove from queue" className="text-link" style={{ fontSize: 'var(--as-text-xs)' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </Modal>
  );
}

// ─── Credit Autocomplete ────────────────────────────────────────────────

function CreditAutocomplete({
  value,
  onChange,
  knownCredits,
}: {
  value: string;
  onChange: (name: string, url?: string) => void;
  knownCredits: Map<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const names = [...knownCredits.keys()].sort((a, b) => a.localeCompare(b));
  const filtered = value.trim()
    ? names.filter(n => n.toLowerCase().includes(value.trim().toLowerCase()))
    : names;

  function select(name: string) {
    onChange(name, knownCredits.get(name));
    setOpen(false);
  }

  return (
    <div
      style={{ position: 'relative', flex: 1 }}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <input
        type="text"
        placeholder="Credit (optional)"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        className="upload-input-sm"
        style={{ width: '100%' }}
      />
      {open && filtered.length > 0 && (
        <div className="base-dropdown__panel" style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, maxHeight: '180px' }}>
          {filtered.map(name => (
            <button key={name} type="button" onClick={() => select(name)}>
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edit Metadata Dialog ─────────────────────────────────────────────

function EditMetadataDialog({
  item,
  onClose,
  onSaved,
}: {
  item: MediaItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [filename, setFilename]   = useState(item.slug);
  const [alt, setAlt]             = useState(item.alt);
  const [caption, setCaption]     = useState(item.caption ?? '');
  const [credit, setCredit]       = useState(item.credit ?? '');
  const [creditUrl, setCreditUrl] = useState(item.creditUrl ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [knownCredits] = useState<Map<string, string>>(new Map());

  const filenameChanged = filename.trim() !== item.slug && filename.trim().length > 0;
  const isDirty = filename !== item.slug || alt !== item.alt || caption !== (item.caption ?? '') ||
    credit !== (item.credit ?? '') || creditUrl !== (item.creditUrl ?? '');

  async function handleSave() {
    if (!alt.trim() || !filename.trim()) return;
    setSaving(true);
    setError('');

    let activeSlug = item.slug;

    if (filenameChanged) {
      const renameRes = await fetch('/api/media/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: item.folder, oldSlug: item.slug, newSlug: filename.trim() }),
      });
      if (!renameRes.ok) {
        const data = await renameRes.json().catch(() => ({}));
        setError(data.error ?? 'Rename failed.');
        setSaving(false);
        return;
      }
      activeSlug = filename.trim();
    }

    const metaRes = await fetch('/api/media/metadata', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: item.folder, slug: activeSlug, alt, caption, credit, creditUrl }),
    });

    setSaving(false);

    if (metaRes.ok) {
      onSaved();
    } else {
      setError('Metadata save failed.');
    }
  }

  return (
    <Modal
      onClose={onClose}
      title="Edit Image"
      closeDisabled={saving}
      isDirty={isDirty}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn--ghost">Cancel</button>
          <button type="button" onClick={handleSave} disabled={!alt.trim() || !filename.trim() || saving} className="btn btn--primary">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <img src={item.urls?.squareJpg} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 'var(--as-radius-md)', marginBottom: 'var(--as-gap)' }} />

      <div className="form-row">
        <label className="form-label">Filename</label>
        <input type="text" value={filename} onChange={e => setFilename(slugify(e.target.value))} className="form-input" style={{ fontFamily: 'monospace' }} />
        {filenameChanged && (
          <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)' }}>
            Renaming updates storage. Existing references will need to be re-selected.
          </p>
        )}
      </div>

      <div className="form-row">
        <label className="form-label">Alt text *</label>
        <textarea value={alt} onChange={e => setAlt(e.target.value)} rows={2} className={!alt.trim() ? 'form-input upload-input-sm--invalid' : 'form-input'} />
        {alt.trim().length > 125 && (
          <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-warning)' }}>
            {alt.trim().length} characters — concise alt text communicates better and is less overwhelming for screen reader users.
          </p>
        )}
      </div>

      <div className="form-row">
        <label className="form-label">Caption</label>
        <input type="text" value={caption} onChange={e => setCaption(e.target.value)} className="form-input" />
      </div>

      <div className="form-row">
        <label className="form-label">Credit</label>
        <CreditAutocomplete value={credit} onChange={(name, url) => { setCredit(name); if (url) setCreditUrl(url); }} knownCredits={knownCredits} />
      </div>

      <div className="form-row">
        <label className="form-label">Credit link URL</label>
        <input type="url" value={creditUrl} onChange={e => setCreditUrl(e.target.value)} placeholder="https://…" className="form-input" />
      </div>

      {error && <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-error)' }}>{error}</p>}
    </Modal>
  );
}