import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { and, eq, lte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.SCHEDULER_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postToBluesky }       = await import('@/lib/connectors/bluesky');
  const { postToMastodon }      = await import('@/lib/connectors/mastodon');
  const { postTargets: targets } = await import('@/lib/db/schema');

  const due = await db.query.posts.findMany({
    where: and(eq(posts.status, 'scheduled'), lte(posts.scheduledAt, new Date())),
    with: { targets: true },
  });

  const results: { postId: number; success: boolean }[] = [];

  for (const post of due) {
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
        await db.update(targets)
          .set({ status: 'posted', platformPostId: result.postUrl, postedAt: new Date() })
          .where(eq(targets.id, target.id));
      } else {
        anyFailed = true;
        await db.update(targets)
          .set({ status: 'failed', errorMessage: result.error })
          .where(eq(targets.id, target.id));
      }
    }

    await db.update(posts)
      .set({ status: anyFailed ? 'failed' : 'posted', updatedAt: new Date() })
      .where(eq(posts.id, post.id));

    results.push({ postId: post.id, success: !anyFailed });
  }

  return NextResponse.json({ checked: due.length, results });
}