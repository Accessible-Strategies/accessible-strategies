'use server';

import { db } from '@/lib/db';
import { posts, postTargets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createPost(data: {
  content: string;
  scheduledAt?: Date;
  platforms: ('bluesky' | 'mastodon')[];
}) {
  const [post] = await db.insert(posts).values({
    content: data.content,
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
 * Updates a post's content/schedule AND its platform targets in one call.
 * Targets are replaced wholesale (delete all, re-insert selection) rather
 * than diffed — simple and safe since nothing has actually been posted
 * yet at this stage (no per-target status/history to preserve).
 */
export async function updatePostWithTargets(id: number, data: {
  content: string;
  scheduledAt?: Date;
  platforms: ('bluesky' | 'mastodon')[];
}) {
  const [updated] = await db.update(posts)
    .set({
      content: data.content,
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
 * scheduledAt. Used for manual testing before Cron automation exists.
 * Updates each target's status/platformPostId/postedAt/errorMessage, then
 * sets the parent post's status based on the aggregate outcome.
 */
export async function publishPostNow(postId: number) {
  const { postToBluesky }  = await import('@/lib/connectors/bluesky');
  const { postToMastodon } = await import('@/lib/connectors/mastodon');

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
    with: { targets: true },
  });

  if (!post) throw new Error('Post not found');

  let anyFailed = false;

  for (const target of post.targets) {
    let result: { success: boolean; postUrl?: string; error?: string };

    if (target.platform === 'bluesky') {
      result = await postToBluesky(post.content);
    } else if (target.platform === 'mastodon') {
      result = await postToMastodon(post.content);
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