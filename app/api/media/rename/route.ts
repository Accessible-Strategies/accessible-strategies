import { NextRequest, NextResponse } from 'next/server';
import { imageKeys } from '@/lib/imageProcessing';
import { renameObject } from '@/lib/r2';
import { findMediaItem, renameMediaItem } from '@/lib/mediaIndex';

export async function POST(req: NextRequest) {
  try {
    const { folder, oldSlug, newSlug } = await req.json();

    if (!folder || !oldSlug || !newSlug) {
      return NextResponse.json({ error: 'folder, oldSlug, and newSlug are required.' }, { status: 400 });
    }

    // Guard against renaming onto an existing slug
    const existing = await findMediaItem(folder, newSlug);
    if (existing) {
      return NextResponse.json({ error: `An image with the slug "${newSlug}" already exists.` }, { status: 409 });
    }

    const oldKeys = imageKeys(folder, oldSlug);
    const newKeys = imageKeys(folder, newSlug);

    await Promise.all([
      renameObject(oldKeys.fullJpg, newKeys.fullJpg),
      renameObject(oldKeys.fullWebp, newKeys.fullWebp),
      renameObject(oldKeys.squareJpg, newKeys.squareJpg),
      renameObject(oldKeys.squareWebp, newKeys.squareWebp),
    ]);

    const item = await renameMediaItem(folder, oldSlug, newSlug);

    if (!item) {
      return NextResponse.json({ error: 'Item not found in index after rename.' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error('media/rename error:', err);
    return NextResponse.json({ error: 'Rename failed.' }, { status: 500 });
  }
}