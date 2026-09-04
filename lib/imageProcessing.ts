import sharp from "sharp";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessedImage {
  fullJpg:     Buffer;
  fullWebp:    Buffer;
  squareJpg:   Buffer;
  squareWebp:  Buffer;
  width:       number;
  height:      number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FULL_WIDTH   = 1920;
const FULL_HEIGHT  = 825;
const SQUARE_SIZE  = 825;
const JPG_QUALITY  = 85;
const WEBP_QUALITY = 85;

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Process an uploaded image into 4 variants:
 * - Full JPG  (1920×825)
 * - Full WebP (1920×825)
 * - Square JPG  (825×825, auto center-crop)
 * - Square WebP (825×825, auto center-crop)
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  // Validate input is a supported image
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Could not read image dimensions.");
  }

  // ── Full size (1920×825) ─────────────────────────────────────────────────
  // Fit inside the bounding box without distortion; pad with black if needed
  const fullBase = await sharp(input)
    .resize(FULL_WIDTH, FULL_HEIGHT, {
      fit:        "cover",
      position:   "centre",
    })
    .toBuffer();

  const fullJpg = await sharp(fullBase)
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
    .toBuffer();

  const fullWebp = await sharp(fullBase)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  // ── Square (825×825, center crop) ────────────────────────────────────────
  const squareBase = await sharp(input)
    .resize(SQUARE_SIZE, SQUARE_SIZE, {
      fit:      "cover",
      position: "centre",
    })
    .toBuffer();

  const squareJpg = await sharp(squareBase)
    .jpeg({ quality: JPG_QUALITY, mozjpeg: true })
    .toBuffer();

  const squareWebp = await sharp(squareBase)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return {
    fullJpg,
    fullWebp,
    squareJpg,
    squareWebp,
    width:  FULL_WIDTH,
    height: FULL_HEIGHT,
  };
}

// ─── Slug helper ──────────────────────────────────────────────────────────────

/**
 * Generate a filename slug from alt text.
 * e.g. "A person using a wheelchair" → "a-person-using-a-wheelchair"
 */
export function altTextToSlug(altText: string): string {
  return altText
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80); // cap length to keep filenames sane
}

/**
 * R2 keys for all 4 variants given a folder and base slug.
 * e.g. folder="posts", slug="person-in-wheelchair"
 */
export function imageKeys(folder: string, slug: string) {
  return {
    fullJpg:    `${folder}/${slug}.jpg`,
    fullWebp:   `${folder}/${slug}.webp`,
    squareJpg:  `${folder}/${slug}-square.jpg`,
    squareWebp: `${folder}/${slug}-square.webp`,
  };
}