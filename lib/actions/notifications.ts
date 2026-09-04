'use server';

import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';

export async function syncNotifications() {
  const { fetchBlueskyNotifications }  = await import('@/lib/connectors/bluesky');
  const { fetchMastodonNotifications } = await import('@/lib/connectors/mastodon');

  const [bluesky, mastodon] = await Promise.allSettled([
    fetchBlueskyNotifications(),
    fetchMastodonNotifications(),
  ]);

  const items = [
    ...(bluesky.status === 'fulfilled' ? bluesky.value.map(n => ({ ...n, platform: 'bluesky' })) : []),
    ...(mastodon.status === 'fulfilled' ? mastodon.value.map(n => ({ ...n, platform: 'mastodon' })) : []),
  ];

  for (const item of items) {
    const existing = await db.query.notifications.findFirst({
      where: and(eq(notifications.platform, item.platform), eq(notifications.externalId, item.externalId)),
    });

    if (!existing) {
      await db.insert(notifications).values({
        platform: item.platform,
        externalId: item.externalId,
        type: item.type,
        authorHandle: item.authorHandle,
        authorDisplayName: item.authorDisplayName,
        content: item.content,
        url: item.url,
        createdAt: item.createdAt,
      });
    }
  }

  return {
    synced: items.length,
    blueskyError: bluesky.status === 'rejected' ? String(bluesky.reason) : null,
    mastodonError: mastodon.status === 'rejected' ? String(mastodon.reason) : null,
  };
}

export async function listNotifications() {
  return db.query.notifications.findMany({
    orderBy: (n, { desc }) => [desc(n.createdAt)],
  });
}

export async function markNotificationRead(id: number) {
  await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead() {
  await db.update(notifications).set({ read: true }).where(eq(notifications.read, false));
}