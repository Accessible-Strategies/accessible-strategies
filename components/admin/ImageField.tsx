'use client';

import { useState } from 'react';
import MediaBrowser, { MediaItem } from '@/components/admin/MediaBrowser';

export interface ImageFieldProps {
  label: string;
  collection: string;
  value: string | null;
  alt: string | null;
  onChange: (update: { url: string; alt: string; caption: string; credit: string; creditUrl: string }) => void;
  aspectRatio?: 'full' | 'square';
  description?: string;
}

export default function ImageField({
  label,
  collection,
  value,
  alt,
  onChange,
  aspectRatio = 'full',
  description,
}: ImageFieldProps) {
  const [browserOpen, setBrowserOpen] = useState(false);
  const isOnR2 = !value || value.startsWith(process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '');

  function handleSelect(item: MediaItem) {
    const url = aspectRatio === 'square' ? item.urls?.squareJpg : item.urls?.fullJpg;
    if (!url) return;
    onChange({ url, alt: item.alt, caption: item.caption ?? '', credit: item.credit ?? '', creditUrl: item.creditUrl ?? '' });
  }

  function handleRemove() {
    onChange({ url: '', alt: '', caption: '', credit: '', creditUrl: '' });
  }

  return (
    <div className="form-row">
      <label className="form-label">{label}</label>
      {description && <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)' }}>{description}</p>}

      <div style={{
        position: 'relative',
        aspectRatio: aspectRatio === 'square' ? '1' : '1920 / 825',
        width: '100%',
        backgroundColor: 'var(--as-bg-header)',
        border: '1px solid var(--as-border)',
        borderRadius: 'var(--as-radius-md)',
        overflow: 'hidden',
      }}>
        {value ? (
          <img src={value} alt={alt ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--as-text-muted)' }}>
            No image selected
          </div>
        )}
        {value && !isOnR2 && (
          <div className="media-card__alt-badge" style={{ top: '8px', right: '8px' }}>Not on R2</div>
        )}
      </div>

      {value && !alt?.trim() && (
        <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-error)' }}>This image is missing alt text.</p>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setBrowserOpen(true)}
          className="btn btn--ghost"
        >
          {value ? `Change ${label}` : `Select ${label}`}
        </button>
        {value && (
          <button type="button" onClick={handleRemove} className="btn btn--ghost">
            Remove {label}
          </button>
        )}
      </div>

      {browserOpen && (
        <MediaBrowser mode="select" defaultFolder={collection} onSelect={handleSelect} onClose={() => setBrowserOpen(false)} />
      )}
    </div>
  );
}