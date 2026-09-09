'use server';

import { db } from '@/lib/db';
import { posts, postTargets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createPost(data: {
  content: string;
  threadParts?: string[];
  scheduledAt?: Date;
  platforms: ('bluesky' | 'mastodon')[];
}) {
  const [post] = await db.insert(posts).values({
    content: data.content,
    threadParts: data.threadParts && data.threadParts.length > 0 ? data.threadParts : null,
    scheduledAt: data.scheduledAt,
    status: data.scheduledAt ? 'scheduled' : 'draft',
  }).returning();

  if (data.platforms.length > 0) {
    await db.insert(postTargets).values(
      data.platforms.map(platform => ({ postId: post.id, platform }))
    );
  }

  return post;
}

export async function listPosts() {
  return db.query.posts.findMany({
    with: { targets: true },
    orderBy: (p, { desc }) => [desc(p.scheduledAt)],
  });
}

export async function updatePost(id: number, data: { content?: string; scheduledAt?: Date; status?: string }) {
  const [updated] = await db.update(posts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(posts.id, id))
    .returning();
  return updated;
}

/**
 * Updates a post's content/schedule/thread AND its platform targets in
 * one call. Targets are replaced wholesale (delete all, re-insert
 * selection) rather than diffed — simple and safe since nothing has
 * actually been posted yet at this stage (no per-target status/history
 * to preserve).
 */
export async function updatePostWithTargets(id: number, data: {
  content: string;
  threadParts?: string[];
  scheduledAt?: Date;
  platforms: ('bluesky' | 'mastodon')[];
}) {
  const [updated] = await db.update(posts)
    .set({
      content: data.content,
      threadParts: data.threadParts && data.threadParts.length > 0 ? data.threadParts : null,
      scheduledAt: data.scheduledAt,
      status: data.scheduledAt ? 'scheduled' : 'draft',
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning();

  await db.delete(postTargets).where(eq(postTargets.postId, id));

  if (data.platforms.length > 0) {
    await db.insert(postTargets).values(
      data.platforms.map(platform => ({ postId: id, platform }))
    );
  }

  return updated;
}

export async function deletePost(id: number) {
  await db.delete(posts).where(eq(posts.id, id));
}

/**
 * Publishes a post to all its target platforms right now, regardless of
 * scheduledAt. Used for manual testing before Cron automation exists,
 * and as the actual publish step the cron route calls for due posts.
 * Updates each target's status/platformPostId/postedAt/errorMessage, then
 * sets the parent post's status based on the aggregate outcome.
 *
 * If the post has threadParts, posts a whole thread (content followed by
 * each part, each replying to the previous) instead of a single post.
 */
export async function publishPostNow(postId: number) {
  const { postToBluesky, postThreadToBluesky }   = await import('@/lib/connectors/bluesky');
  const { postToMastodon, postThreadToMastodon } = await import('@/lib/connectors/mastodon');

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: { targets: true },
  });

  if (!post) throw new Error('Post not found');

  const threadParts = (post.threadParts as string[] | null) ?? [];
  const isThread = threadParts.length > 0;
  const allParts = [post.content, ...threadParts];

  let anyFailed = false;

  for (const target of post.targets) {
    let result: { success: boolean; postUrl?: string; error?: string };

    if (target.platform === 'bluesky') {
      result = isThread ? await postThreadToBluesky(allParts) : await postToBluesky(post.content);
    } else if (target.platform === 'mastodon') {
      result = isThread ? await postThreadToMastodon(allParts) : await postToMastodon(post.content);
    } else {
      result = { success: false, error: `Unknown platform: ${target.platform}` };
    }

    if (result.success) {
      await db.update(postTargets)
        .set({ status: 'posted', platformPostId: result.postUrl, postedAt: new Date() })
        .where(eq(postTargets.id, target.id));
    } else {
      anyFailed = true;
      await db.update(postTargets)
        .set({ status: 'failed', errorMessage: result.error })
        .where(eq(postTargets.id, target.id));
    }
  }

  await db.update(posts)
    .set({ status: anyFailed ? 'failed' : 'posted', updatedAt: new Date() })
    .where(eq(posts.id, postId));

  return { success: !anyFailed };
}