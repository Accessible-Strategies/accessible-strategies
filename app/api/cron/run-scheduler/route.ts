import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { and, eq, lte } from 'drizzle-orm';
import { publishPostNow } from '@/lib/actions/posts';

/**
 * Vercel Cron entry point — fire-and-forget, ~15 minute accuracy window
 * (matches the cron schedule below). Finds every post that's due
 * (status = 'scheduled' and scheduledAt in the past) and publishes it via
 * the same publishPostNow() used for manual "publish now" testing, so the
 * two paths can never drift out of sync.
 *
 * Posts are processed one at a time, sequentially, on purpose — this
 * avoids hammering either platform's API with concurrent requests from a
 * single tick and keeps failures isolated (one bad post's error doesn't
 * interrupt the rest of the batch).
 *
 * Auth: Vercel signs cron requests with an Authorization: Bearer header
 * matching CRON_SECRET (set in Vercel env vars). Anything else is rejected
 * so this route can't be triggered by a stray public request.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const due = await db.query.posts.findMany({
    where: and(eq(posts.status, 'scheduled'), lte(posts.scheduledAt, new Date())),
  });

  const results: { id: number; success: boolean; error?: string }[] = [];

  for (const post of due) {
    try {
      const { success } = await publishPostNow(post.id);
      results.push({ id: post.id, success });
    } catch (err) {
      // publishPostNow itself shouldn't throw (it catches per-target errors),
      // but guard anyway so one broken post can't kill the rest of the run.
      console.error(`Cron: publishPostNow failed for post ${post.id}:`, err);
      results.push({ id: post.id, success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    dueCount: due.length,
    results,
  });
}