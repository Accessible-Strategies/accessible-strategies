'use client';

import { useState, useEffect, useCallback } from 'react';
import { listNotifications, syncNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifications';
import { BlueskyIcon, MastodonIcon } from '@/components/icons/Icons';

const PLATFORM_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  bluesky: BlueskyIcon,
  mastodon: MastodonIcon,
};

const TYPE_LABEL: Record<string, string> = {
  mention: 'Mentioned you',
  reply: 'Replied to you',
  reblog: 'Boosted your post',
  repost: 'Reposted your post',
  favourite: 'Liked your post',
  like: 'Liked your post',
  follow: 'Followed you',
  quote: 'Quoted your post',
};

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    listNotifications().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    const result = await syncNotifications();
    setSyncing(false);
    if (result.blueskyError || result.mastodonError) {
      setSyncError([result.blueskyError, result.mastodonError].filter(Boolean).join(' \u2022 '));
    }
    refresh();
  }

  async function handleMarkRead(id: number) {
    await markNotificationRead(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setItems(prev => prev.map(i => ({ ...i, read: true })));
  }

  const unreadCount = items.filter(i => !i.read).length;

  return (
    <section className="container admin-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--as-gap)', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button className="btn btn--ghost" onClick={handleMarkAllRead}>Mark all read</button>
          )}
          <button className="btn btn--primary" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>
        </div>
      </div>

      {syncError && (
        <p style={{ color: 'var(--as-error)', fontSize: 'var(--as-text-sm)', marginBottom: 'var(--as-gap)' }}>
          {syncError}
        </p>
      )}

      {loading ? (
        <p style={{ color: 'var(--as-text-muted)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <p style={{ color: 'var(--as-text-muted)' }}>No notifications yet — click "Sync now" to check.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(item => {
            const Icon = PLATFORM_ICON[item.platform];
            return (
              <div
                key={item.id}
                className="card"
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: '12px',
                  opacity: item.read ? 0.6 : 1,
                  borderColor: item.read ? undefined : 'var(--as-heading)',
                }}
              >
                {Icon && <Icon size={18} />}
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 'var(--as-text-sm)' }}>
                    <strong>{item.authorDisplayName}</strong>{' '}
                    <span style={{ color: 'var(--as-text-muted)' }}>@{item.authorHandle}</span>
                    {' \u2014 '}
                    {TYPE_LABEL[item.type] ?? item.type}
                  </p>
                  {item.content && (
                    <p style={{ fontSize: 'var(--as-text-sm)', color: 'var(--as-text-muted)', margin: '4px 0 0' }}>
                      {item.content}
                    </p>
                  )}
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ fontSize: 'var(--as-text-xs)' }}>
                    {`View on ${item.platform === 'bluesky' ? 'Bluesky' : 'Mastodon'} \u2192`}
                  </a>
                </div>
                {!item.read && (
                  <button className="btn btn--ghost" onClick={() => handleMarkRead(item.id)} style={{ flexShrink: 0 }}>
                    Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}