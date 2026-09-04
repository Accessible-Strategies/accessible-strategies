'use server';

import { db } from '@/lib/db';
import { siteSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULTS = {
  notFoundTitle:   'Page not found',
  notFoundMessage: 'The page you\u2019re looking for doesn\u2019t exist, or may have moved.',
};

/**
 * Always returns usable values, even if the table is empty or the DB
 * is unreachable — a broken fetch here should never break the 404
 * page itself. Falls back to hardcoded defaults on any failure.
 */
export async function getSiteSettings() {
  try {
    const row = await db.query.siteSettings.findFirst();
    return row ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function updateSiteSettings(data: {
  notFoundTitle: string;
  notFoundMessage: string;
}) {
  const existing = await db.query.siteSettings.findFirst();

  if (existing) {
    const [updated] = await db.update(siteSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(siteSettings.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db.insert(siteSettings).values(data).returning();
  return created;
}