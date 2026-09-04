import { getObject, putObject } from './r2';

// ─── Types ────────────────────────────────────────────────────────────────

export interface MediaItem {
  slug:        string;
  folder:      string;
  alt:         string;
  caption?:    string;
  credit?:     string;
  creditUrl?:  string;
  uploadedAt:  string;
  width:       number;
  height:      number;
  urls?: {
    fullJpg:    string;
    fullWebp:   string;
    squareJpg:  string;
    squareWebp: string;
  };
}

interface MediaIndex {
  version: number;
  items:   MediaItem[];
}

const INDEX_KEY = '_index.json';

// ─── Index read/write ───────────────────────────────────────────────────────
// No locking — accepted risk for a single-admin, low-traffic tool. Every
// write does a full read-modify-write of the whole index. Two near-
// simultaneous writes could clobber each other. See DDL for the explicit
// decision record.

async function readIndex(): Promise<MediaIndex> {
  try {
    const body = await getObject(INDEX_KEY);
    if (!body) return { version: 1, items: [] };
    const text = await body.transformToString();
    return JSON.parse(text) as MediaIndex;
  } catch {
    // Index doesn't exist yet — first upload ever
    return { version: 1, items: [] };
  }
}

async function writeIndex(index: MediaIndex): Promise<void> {
  const body = Buffer.from(JSON.stringify(index, null, 2));
  await putObject(INDEX_KEY, body, 'application/json');
}

// ─── URL attachment — computed on read, never stored ────────────────────────

export function attachUrls(item: MediaItem): MediaItem {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';
  return {
    ...item,
    urls: {
      fullJpg:    `${base}/${item.folder}/${item.slug}.jpg`,
      fullWebp:   `${base}/${item.folder}/${item.slug}.webp`,
      squareJpg:  `${base}/${item.folder}/${item.slug}-square.jpg`,
      squareWebp: `${base}/${item.folder}/${item.slug}-square.webp`,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function listMedia(folder?: string): Promise<MediaItem[]> {
  const index = await readIndex();
  const items = folder
    ? index.items.filter(i => i.folder === folder)
    : index.items;
  return items.map(attachUrls);
}

export async function findMediaItem(folder: string, slug: string): Promise<MediaItem | null> {
  const index = await readIndex();
  const item = index.items.find(i => i.folder === folder && i.slug === slug);
  return item ? attachUrls(item) : null;
}

export async function addMediaItem(item: Omit<MediaItem, 'urls'>): Promise<MediaItem> {
  const index = await readIndex();
  index.items.push(item);
  await writeIndex(index);
  return attachUrls(item);
}

export async function updateMediaMetadata(
  folder: string,
  slug: string,
  updates: { alt: string; caption?: string; credit?: string; creditUrl?: string }
): Promise<MediaItem | null> {
  const index = await readIndex();
  const item = index.items.find(i => i.folder === folder && i.slug === slug);
  if (!item) return null;

  item.alt        = updates.alt;
  item.caption     = updates.caption;
  item.credit      = updates.credit;
  item.creditUrl   = updates.creditUrl;

  await writeIndex(index);
  return attachUrls(item);
}

export async function renameMediaItem(
  folder: string,
  oldSlug: string,
  newSlug: string
): Promise<MediaItem | null> {
  const index = await readIndex();
  const item = index.items.find(i => i.folder === folder && i.slug === oldSlug);
  if (!item) return null;

  item.slug = newSlug;

  await writeIndex(index);
  return attachUrls(item);
}

export async function removeMediaItem(folder: string, slug: string): Promise<void> {
  const index = await readIndex();
  index.items = index.items.filter(i => !(i.folder === folder && i.slug === slug));
  await writeIndex(index);
}