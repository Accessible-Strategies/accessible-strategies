'use server';

import { db } from '@/lib/db';
import { pages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function createPage(data: { slug: string; title: string }) {
  const [page] = await db.insert(pages).values({
    slug: data.slug,
    title: data.title,
  }).returning();
  return page;
}

export async function listPages() {
  return db.query.pages.findMany({
    orderBy: (p, { desc }) => [desc(p.updatedAt)],
  });
}

export async function getPage(id: number) {
  return db.query.pages.findFirst({ where: eq(pages.id, id) });
}

export async function getPageBySlug(slug: string) {
  return db.query.pages.findFirst({ where: eq(pages.slug, slug) });
}

export async function updatePage(id: number, data: {
  title?: string;
  slug?: string;
  body?: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
  metaDescription?: string;
  status?: string;
}) {
  const [updated] = await db.update(pages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pages.id, id))
    .returning();
  return updated;
}

export async function deletePage(id: number) {
  await db.delete(pages).where(eq(pages.id, id));
}