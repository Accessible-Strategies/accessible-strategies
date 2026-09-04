import { NextRequest, NextResponse } from 'next/server';
import { listMedia } from '@/lib/mediaIndex';

export async function GET(req: NextRequest) {
  const folder = req.nextUrl.searchParams.get('folder') ?? undefined;

  try {
    const items = await listMedia(folder);
    return NextResponse.json(items);
  } catch (err) {
    console.error('media/list error:', err);
    return NextResponse.json({ error: 'Failed to load media.' }, { status: 500 });
  }
}