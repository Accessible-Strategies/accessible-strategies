'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPage, updatePage, deletePage } from '@/lib/actions/pages';
import ImageField from '@/components/admin/ImageField';
import SmartCaseInput from '@/components/admin/SmartCaseInput';
import RichTextEditor from '@/components/admin/RichTextEditor';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface PageData {
  id: number;
  slug: string;
  title: string;
  body: string;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  metaDescription: string | null;
  status: string;
}

export default function PageEditor({ pageId }: { pageId: number }) {
  const router = useRouter();
  const [page, setPage]         = useState<PageData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [savedAt, setSavedAt]   = useState<Date | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    getPage(pageId).then(p => {
      if (p) setPage(p as PageData);
      setLoading(false);
    });
  }, [pageId]);

  async function handleSave() {
    if (!page) return;
    setSaving(true);
    await updatePage(page.id, {
      title: page.title,
      slug: page.slug,
      body: page.body,
      heroImageUrl: page.heroImageUrl ?? undefined,
      heroImageAlt: page.heroImageAlt ?? undefined,
      metaDescription: page.metaDescription ?? undefined,
      status: page.status,
    });
    setSaving(false);
    setSavedAt(new Date());
  }

  async function handleDelete() {
    if (!page) return;
    await deletePage(page.id);
    router.push('/admin/pages');
  }

  function update(patch: Partial<PageData>) {
    setPage(prev => prev ? { ...prev, ...patch } : prev);
  }

  if (loading) return <p style={{ color: 'var(--as-text-muted)' }}>Loading…</p>;
  if (!page) return <p style={{ color: 'var(--as-error)' }}>Page not found.</p>;

  return (
    <div className="contact-page__inner">
      <div className="form-row">
        <label className="form-label" htmlFor="page-title">Title</label>
        <SmartCaseInput id="page-title" value={page.title} onChange={v => update({ title: v })} />
      </div>

      <div className="form-row">
        <label className="form-label" htmlFor="page-slug">Slug</label>
        <input id="page-slug" value={page.slug} onChange={e => update({ slug: e.target.value })} className="form-input" style={{ fontFamily: 'monospace' }} />
      </div>

      <ImageField
        label="Hero image"
        collection="general"
        value={page.heroImageUrl}
        alt={page.heroImageAlt}
        onChange={u => update({ heroImageUrl: u.url || null, heroImageAlt: u.alt || null })}
      />

      <div className="form-row">
        <label className="form-label" htmlFor="page-meta-description">Meta description</label>
        <textarea id="page-meta-description" value={page.metaDescription ?? ''} onChange={e => update({ metaDescription: e.target.value })} rows={2} className="form-input" />
      </div>

      <div className="form-row">
        <label className="form-label">Body</label>
        <RichTextEditor value={page.body} onChange={v => update({ body: v })} mediaFolder="general" ariaLabel="Body" />
      </div>

      <div className="form-row">
        <label className="form-label" id="page-status-label">Status</label>
        <div className="reason-list reason-list--compact" role="radiogroup" aria-labelledby="page-status-label">
          {['draft', 'published'].map(s => (
            <label key={s} className={`reason-option reason-option--compact${page.status === s ? ' reason-option--active' : ''}`}>
              <input type="radio" name="status" checked={page.status === s} onChange={() => update({ status: s })} className="sr-only" />
              <span className="reason-option__label">{s[0].toUpperCase() + s.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: 'var(--as-gap)' }}>
        <button onClick={handleSave} disabled={saving} className="btn btn--primary">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={() => setConfirmingDelete(true)} className="btn btn--ghost">Delete page</button>
        {savedAt && !saving && (
          <span style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)' }}>
            Saved {savedAt.toLocaleTimeString()}
          </span>
        )}
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete Page?"
          message={`Delete "${page.title}"? This can\u2019t be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}