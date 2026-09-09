'use server';

export async function getBlueskyFollowing(cursor?: string) {
  const { fetchBlueskyFollowing } = await import('@/lib/connectors/bluesky');
  return fetchBlueskyFollowing(cursor);
}

export async function getMastodonFollowing() {
  const { fetchMastodonFollowing } = await import('@/lib/connectors/mastodon');
  return fetchMastodonFollowing();
}

export async function likeBluesky(uri: string, cid: string) {
  const { likeBlueskyPost } = await import('@/lib/connectors/bluesky');
  return likeBlueskyPost(uri, cid);
}

export async function unlikeBluesky(likeUri: string) {
  const { unlikeBlueskyPost } = await import('@/lib/connectors/bluesky');
  return unlikeBlueskyPost(likeUri);
}

export async function repostBluesky(uri: string, cid: string) {
  const { repostBlueskyPost } = await import('@/lib/connectors/bluesky');
  return repostBlueskyPost(uri, cid);
}

export async function unrepostBluesky(repostUri: string) {
  const { unrepostBlueskyPost } = await import('@/lib/connectors/bluesky');
  return unrepostBlueskyPost(repostUri);
}

export async function replyToBluesky(
  text: string,
  root: { uri: string; cid: string },
  parent: { uri: string; cid: string }
) {
  const { replyToBlueskyPost } = await import('@/lib/connectors/bluesky');
  return replyToBlueskyPost(text, root, parent);
}

export async function muteBluesky(did: string) {
  const { muteBlueskyAccount } = await import('@/lib/connectors/bluesky');
  return muteBlueskyAccount(did);
}

export async function unmuteBluesky(did: string) {
  const { unmuteBlueskyAccount } = await import('@/lib/connectors/bluesky');
  return unmuteBlueskyAccount(did);
}

export async function getBlueskyThread(uri: string) {
  const { fetchBlueskyThread } = await import('@/lib/connectors/bluesky');
  return fetchBlueskyThread(uri);
}

// ─── Saved posts ────────────────────────────────────────────────────────
// Admin-side bookmarking, independent of any platform's own save feature —
// works the same for Bluesky and Mastodon since it's just a local DB row,
// not a platform write action.

export async function savePost(input: {
  platform: string;
  externalId: string;
  authorHandle?: string;
  authorDisplayName?: string;
  content?: string;
  url?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = await import('@/lib/db');
    const { savedPosts } = await import('@/lib/db/schema');
    const { and, eq } = await import('drizzle-orm');

    const existing = await db
      .select({ id: savedPosts.id })
      .from(savedPosts)
      .where(and(eq(savedPosts.platform, input.platform), eq(savedPosts.externalId, input.externalId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(savedPosts).values(input);
    }
    return { success: true };
  } catch (err) {
    console.error('Save post failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function unsavePost(platform: string, externalId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = await import('@/lib/db');
    const { savedPosts } = await import('@/lib/db/schema');
    const { and, eq } = await import('drizzle-orm');

    await db.delete(savedPosts).where(and(eq(savedPosts.platform, platform), eq(savedPosts.externalId, externalId)));
    return { success: true };
  } catch (err) {
    console.error('Unsave post failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function listSavedPostIds(platform: string): Promise<string[]> {
  try {
    const { db } = await import('@/lib/db');
    const { savedPosts } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const rows = await db
      .select({ externalId: savedPosts.externalId })
      .from(savedPosts)
      .where(eq(savedPosts.platform, platform));
    return rows.map(r => r.externalId);
  } catch (err) {
    console.error('List saved posts failed:', err);
    return [];
  }
}
export async function getBlueskySavedFeeds() {
  const { getBlueskySavedFeeds: fetchSavedFeeds } = await import('@/lib/connectors/bluesky');
  return fetchSavedFeeds();
}

export async function getBlueskyCustomFeed(feedUri: string, cursor?: string) {
  const { fetchBlueskyCustomFeed } = await import('@/lib/connectors/bluesky');
  return fetchBlueskyCustomFeed(feedUri, cursor);
}