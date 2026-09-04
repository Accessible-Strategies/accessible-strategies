import { NextRequest, NextResponse } from 'next/server';
import { imageKeys } from '@/lib/imageProcessing';
import { deleteObject } from '@/lib/r2';
import { removeMediaItem } from '@/lib/mediaIndex';

export async function DELETE(req: NextRequest) {
  try {
    const { folder, slug } = await req.json();

    if (!folder || !slug) {
      return NextResponse.json({ error: 'folder and slug are required.' }, { status: 400 });
    }

    const keys = imageKeys(folder, slug);

    await Promise.all([
      deleteObject(keys.fullJpg),
      deleteObject(keys.fullWebp),
      deleteObject(keys.squareJpg),
      deleteObject(keys.squareWebp),
    ]);

    await removeMediaItem(folder, slug);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('media/delete error:', err);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
}