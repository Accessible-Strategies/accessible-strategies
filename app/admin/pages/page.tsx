'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listPages, createPage } from '@/lib/actions/pages';
import SmartCaseInput from '@/components/admin/SmartCaseInput';

export default function Pages() {
  const router = useRouter();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  async function refresh() {
    setLoading(true);
    setPages(await listPages());
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    const slug = newTitle.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const page = await createPage({ slug, title: newTitle.trim() });
    router.push(`/admin/pages/${page.id}`);
  }

  return (
    <section className="container admin-content">
      <h1>Pages</h1>

      <div className="form-row" style={{ maxWidth: '500px' }}>
        <label className="form-label">New page title</label>
        <SmartCaseInput value={newTitle} onChange={setNewTitle} />
      </div>
      <button onClick={handleCreate} className="btn btn--primary" style={{ marginTop: '8px', marginBottom: 'var(--as-gap)' }}>+ Create page</button>

      <h2 style={{ marginTop: 'var(--as-gap)' }}>{loading ? 'Loading…' : `${pages.length} pages`}</h2>
      <div className="card-grid">
        {pages.map(p => (
          <div key={p.id} className="card">
            <h3>{p.title}</h3>
            <p className="card__scope">/{p.slug} — {p.status}</p>
            <button onClick={() => router.push(`/admin/pages/${p.id}`)} className="btn btn--ghost">Edit</button>
          </div>
        ))}
      </div>
    </section>
  );
}