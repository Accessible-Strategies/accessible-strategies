import { NextRequest, NextResponse } from 'next/server';
import { processImage, altTextToSlug, imageKeys } from '@/lib/imageProcessing';
import { putObject } from '@/lib/r2';
import { addMediaItem } from '@/lib/mediaIndex';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file      = formData.get('file') as File | null;
    const alt        = formData.get('alt') as string | null;
    const folder      = formData.get('folder') as string | null;
    const caption      = (formData.get('caption') as string | null) ?? undefined;
    const credit        = (formData.get('credit') as string | null) ?? undefined;
    const creditUrl       = (formData.get('creditUrl') as string | null) ?? undefined;
    const slugOverride       = (formData.get('slug') as string | null) ?? undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
    if (!alt?.trim()) {
      return NextResponse.json({ error: 'Alt text is required.' }, { status: 400 });
    }
    if (!folder?.trim()) {
      return NextResponse.json({ error: 'Folder is required.' }, { status: 400 });
    }

    const slug = slugOverride?.trim() || altTextToSlug(alt);
    const keys = imageKeys(folder, slug);

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const processed = await processImage(inputBuffer);

    await Promise.all([
      putObject(keys.fullJpg, processed.fullJpg, 'image/jpeg'),
      putObject(keys.fullWebp, processed.fullWebp, 'image/webp'),
      putObject(keys.squareJpg, processed.squareJpg, 'image/jpeg'),
      putObject(keys.squareWebp, processed.squareWebp, 'image/webp'),
    ]);

    const item = await addMediaItem({
      slug,
      folder,
      alt: alt.trim(),
      caption,
      credit,
      creditUrl,
      uploadedAt: new Date().toISOString(),
      width:  processed.width,
      height: processed.height,
    });

    return NextResponse.json(item);
  } catch (err) {
    console.error('media/upload error:', err);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}