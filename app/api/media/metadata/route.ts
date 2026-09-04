import { NextRequest, NextResponse } from 'next/server';
import { updateMediaMetadata } from '@/lib/mediaIndex';

export async function PUT(req: NextRequest) {
  try {
    const { folder, slug, alt, caption, credit, creditUrl } = await req.json();

    if (!folder || !slug) {
      return NextResponse.json({ error: 'folder and slug are required.' }, { status: 400 });
    }
    if (!alt?.trim()) {
      return NextResponse.json({ error: 'Alt text is required.' }, { status: 400 });
    }

    const item = await updateMediaMetadata(folder, slug, { alt, caption, credit, creditUrl });

    if (!item) {
      return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err) {
    console.error('media/metadata error:', err);
    return NextResponse.json({ error: 'Metadata update failed.' }, { status: 500 });
  }
}