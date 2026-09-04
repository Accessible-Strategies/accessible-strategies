'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { listPosts } from '@/lib/actions/posts';
import ComposePostDialog from '@/components/admin/ComposePostDialog';
import { BlueskyIcon, MastodonIcon } from '@/components/icons/Icons';

type ViewMode = 'kanban' | 'calendar';

const COLUMNS = [
  { key: 'draft',     label: 'Draft'     },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'posted',    label: 'Posted'    },
  { key: 'failed',    label: 'Failed'    },
] as const;

const PLATFORM_LABEL: Record<string, string> = {
  bluesky: 'Bluesky',
  mastodon: 'Mastodon',
};

const PLATFORM_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  bluesky: BlueskyIcon,
  mastodon: MastodonIcon,
};

function formatScheduled(value: string | Date | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' \u2022 '
    + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SchedulerView() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('kanban');
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [keyword, setKeyword] = useState('');
  const [filterPlatforms, setFilterPlatforms] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    setLoading(true);
    listPosts().then(data => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    posts.forEach(p => p.targets?.forEach((t: any) => set.add(t.platform)));
    return [...set].sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return posts.filter(p => {
      const matchesKeyword = !kw || p.content.toLowerCase().includes(kw);
      const matchesPlatform = filterPlatforms.size === 0
        || p.targets?.some((t: any) => filterPlatforms.has(t.platform));
      return matchesKeyword && matchesPlatform;
    });
  }, [posts, keyword, filterPlatforms]);

  function togglePlatformFilter(platform: string) {
    setFilterPlatforms(prev => {
      const next = new Set(prev);
      next.has(platform) ? next.delete(platform) : next.add(platform);
      return next;
    });
  }

  function openNew() {
    setEditingPost(null);
    setComposeOpen(true);
  }

  function openEdit(post: any) {
    setEditingPost(post);
    setComposeOpen(true);
  }

  function handleSaved() {
    setComposeOpen(false);
    setEditingPost(null);
    refresh();
  }

  const calendarDays = useMemo(() => {
    const year  = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset  = firstOfMonth.getDay();
    const gridStart     = new Date(year, month, 1 - startOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
    }
    return days;
  }, [monthCursor]);

  const calendarPosts = useMemo(
    () => filteredPosts.filter(p => (p.status === 'scheduled' || p.status === 'posted') && p.scheduledAt),
    [filteredPosts]
  );

  function postsForDay(day: Date) {
    return calendarPosts.filter(p => sameDay(new Date(p.scheduledAt), day));
  }

  function changeMonth(delta: number) {
    setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--as-gap)', flexWrap: 'wrap', gap: '12px' }}>
        <div className="reason-list reason-list--compact" role="radiogroup" aria-label="Scheduler view">
          {(['kanban', 'calendar'] as ViewMode[]).map(v => (
            <label key={v} className={`reason-option reason-option--compact${view === v ? ' reason-option--active' : ''}`}>
              <input type="radio" name="scheduler-view" checked={view === v} onChange={() => setView(v)} className="sr-only" />
              <span className="reason-option__label">{v === 'kanban' ? 'Kanban' : 'Calendar'}</span>
            </label>
          ))}
        </div>
        <button className="btn btn--primary" onClick={openNew}>+ New Post</button>
      </div>

      <div className="scheduler-filter-bar">
        <input
          type="search"
          placeholder="Search post content…"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          className="media-browser__search"
          aria-label="Search posts by content"
        />
        {availablePlatforms.length > 0 && (
          <div role="group" aria-label="Filter by platform" style={{ display: 'flex', gap: '4px' }}>
            {availablePlatforms.map(platform => {
              const Icon = PLATFORM_ICON[platform];
              const active = filterPlatforms.has(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatformFilter(platform)}
                  aria-pressed={active}
                  title={`Filter: ${PLATFORM_LABEL[platform] ?? platform}`}
                  className={active ? 'icon-hover settings-option--active' : 'icon-hover'}
                >
                  {Icon ? <Icon size={16} /> : (PLATFORM_LABEL[platform] ?? platform)}
                </button>
              );
            })}
          </div>
        )}
        {(keyword || filterPlatforms.size > 0) && (
          <button className="text-link" onClick={() => { setKeyword(''); setFilterPlatforms(new Set()); }} style={{ marginTop: 0 }}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: 'var(--as-text-muted)' }}>Loading…</p>
      ) : view === 'kanban' ? (
        <div className="kanban-board">
          {COLUMNS.map(col => {
            const columnPosts = filteredPosts.filter(p => p.status === col.key);
            return (
              <div key={col.key} className="kanban-column">
                <div className="kanban-column__header">
                  <span className="kanban-column__title">{col.label}</span>
                  <span className="kanban-column__count">{columnPosts.length}</span>
                </div>

                <div className="kanban-column__cards">
                  {columnPosts.length === 0 ? (
                    <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', padding: '0 4px' }}>
                      No posts.
                    </p>
                  ) : (
                    columnPosts.map(post => {
                      const scheduled = formatScheduled(post.scheduledAt);
                      return (
                        <button
                          key={post.id}
                          className="kanban-card"
                          onClick={() => openEdit(post)}
                        >
                          <p className="kanban-card__content">{post.content}</p>
                          <div className="kanban-card__footer">
                            <div className="kanban-card__platforms">
                              {post.targets?.map((t: any) => (
                                <span key={t.platform} className="kanban-card__platform-badge">
                                  {PLATFORM_LABEL[t.platform] ?? t.platform}
                                </span>
                              ))}
                            </div>
                            {scheduled && (
                              <span className="kanban-card__time">{scheduled}</span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="scheduler-calendar">
          <div className="scheduler-calendar__nav">
            <button className="icon-hover" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
            <span className="scheduler-calendar__month-label">
              {monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button className="icon-hover" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
          </div>

          <div className="scheduler-calendar__grid">
            {WEEKDAYS.map(w => (
              <div key={w} className="scheduler-calendar__weekday">{w}</div>
            ))}
            {calendarDays.map((day, i) => {
              const inMonth = day.getMonth() === monthCursor.getMonth();
              const dayPosts = postsForDay(day);
              return (
                <div key={i} className={`scheduler-calendar__day${inMonth ? '' : ' scheduler-calendar__day--outside'}`}>
                  <span className="scheduler-calendar__day-number">{day.getDate()}</span>
                  {dayPosts.map(post => (
                    <button
                      key={post.id}
                      className="scheduler-calendar__post"
                      onClick={() => openEdit(post)}
                      title={post.content}
                    >
                      <span className="scheduler-calendar__post-platforms">
                        {post.targets?.map((t: any) => {
                          const Icon = PLATFORM_ICON[t.platform];
                          return Icon ? <Icon key={t.platform} size={11} /> : null;
                        })}
                      </span>
                      {new Date(post.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      {' \u2022 '}
                      {post.content}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {composeOpen && (
        <ComposePostDialog
          post={editingPost}
          onClose={() => { setComposeOpen(false); setEditingPost(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}