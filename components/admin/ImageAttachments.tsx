'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Loader2, AlertCircle, ZoomIn } from 'lucide-react';
import { uploadPostImageAction } from '@/lib/actions/posts';
import Modal from '@/components/ui/Modal';

export interface AttachedImage {
  cid:             string;
  mimeType:        string;
  size:            number;
  alt:             string;
  aspectRatio?:    { width: number; height: number };
  // A downscaled copy of the image, stored in our own database alongside
  // the alt text — NOT fetched from Bluesky. Bluesky only reliably serves
  // a blob's bytes back once it's referenced by an actual published post;
  // an uploaded-but-still-draft image's blob can 500 on Bluesky's own
  // servers even seconds after upload. Keeping our own copy means the
  // preview never depends on Bluesky's blob lifecycle at all. Absent for
  // any image attached before this was added.
  previewDataUrl?: string;
}

interface ImageAttachmentsProps {
  images:     AttachedImage[];
  onChange:   (images: AttachedImage[]) => void;
  maxImages?: number;
  disabled?:  boolean;
  idPrefix:   string; // unique per instance — main content vs. each thread part
}

// Bluesky's actual limit is close to 1MB per blob — staying comfortably
// under that avoids edge-case rejections from encoding overhead.
const MAX_BLOB_BYTES = 950_000;
const PASSTHROUGH_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface LocalItem extends AttachedImage {
  localId:      string;
  previewUrl?:  string; // what's actually rendered — see initializer/handleFiles for where it comes from
  status:       'uploading' | 'done' | 'error';
  error?:       string;
}

function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(file: File): Promise<{ img: HTMLImageElement; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, objectUrl });
    img.onerror = reject;
    img.src = objectUrl;
  });
}

// Kept small on purpose: this is what actually gets persisted to our own
// database (see previewDataUrl above), not just displayed once. Large
// enough to look sharp in the 800px lightbox, small enough that storing
// it per image doesn't bloat the posts table.
const PREVIEW_MAX_DIM = 640;
const PREVIEW_QUALITY = 0.6;

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => {
        if (!b) return reject(new Error('Could not encode image'));
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(b);
      },
      'image/jpeg',
      quality
    );
  });
}

async function createPreviewDataUrl(img: HTMLImageElement, width: number, height: number): Promise<string> {
  const scale = Math.min(1, PREVIEW_MAX_DIM / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvasToDataUrl(canvas, PREVIEW_QUALITY);
}

/**
 * Reads a file and returns something ready to upload: original bytes if
 * it's already a supported type under the size cap, otherwise a
 * downscaled/re-encoded JPEG. Bluesky doesn't accept arbitrary formats
 * or arbitrarily large blobs, and a phone photo routinely blows past
 * both. Also generates previewDataUrl — our own persisted copy, see the
 * note on AttachedImage.previewDataUrl for why this doesn't just reuse
 * whatever gets uploaded to Bluesky.
 */
async function prepareImage(file: File): Promise<{
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  previewUrl: string;
  previewDataUrl: string;
}> {
  const { img, objectUrl } = await loadImageElement(file);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const previewDataUrl = await createPreviewDataUrl(img, width, height);

  if (file.size <= MAX_BLOB_BYTES && PASSTHROUGH_TYPES.has(file.type)) {
    const base64 = await fileToBase64(file);
    return { base64, mimeType: file.type, width, height, previewUrl: objectUrl, previewDataUrl };
  }

  let scale = Math.min(1, Math.sqrt(MAX_BLOB_BYTES / file.size) || 1);
  let quality = 0.85;
  let lastResult: { base64: string; previewUrl: string; w: number; h: number } | null = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const dataUrl: string = await new Promise((resolve, reject) => {
      canvas.toBlob(
        b => {
          if (!b) return reject(new Error('Could not encode image'));
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(b);
        },
        'image/jpeg',
        quality
      );
    });

    const base64 = dataUrl.split(',')[1] ?? '';
    const approxBytes = base64.length * 0.75;
    lastResult = { base64, previewUrl: dataUrl, w: canvas.width, h: canvas.height };

    if (approxBytes <= MAX_BLOB_BYTES) break;

    quality = Math.max(0.4, quality - 0.15);
    scale = Math.max(0.3, scale - 0.15);
  }

  URL.revokeObjectURL(objectUrl);
  return {
    base64: lastResult!.base64,
    mimeType: 'image/jpeg',
    width: lastResult!.w,
    height: lastResult!.h,
    previewUrl: lastResult!.previewUrl,
    previewDataUrl,
  };
}

let nextLocalId = 0;

export default function ImageAttachments({
  images,
  onChange,
  maxImages = 4,
  disabled = false,
  idPrefix,
}: ImageAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<LocalItem[]>(() =>
    images.map(img => ({
      ...img,
      localId: `existing-${++nextLocalId}`,
      status: 'done' as const,
      // Our own persisted copy — see AttachedImage.previewDataUrl. Nothing
      // to fetch, nothing that can fail at render time: it's already
      // sitting right here in the restored data.
      previewUrl: img.previewDataUrl,
    }))
  );
  // Always mirrors the latest `items`, so async upload callbacks below can
  // read the current list without depending on a possibly-stale closure —
  // and, crucially, without needing to reach for setItems's updater form
  // (see the note on emitChange below for why that matters).
  const itemsRef = useRef<LocalItem[]>(items);

  // IMPORTANT: always call this directly (from an event handler or a
  // promise callback), never from inside a setState updater function —
  // it calls the parent's onChange, which updates ComposePostDialog's
  // state. Doing that from inside e.g. setItems(current => { ...
  // emitChange(next); return next }) trips React's "cannot update a
  // component while rendering a different component" rule, since
  // updater functions must be pure and can be invoked outside a normal
  // render pass.
  const emitChange = useCallback(
    (next: LocalItem[]) => {
      itemsRef.current = next;
      setItems(next);
      onChange(
        next
          .filter((i): i is LocalItem & { status: 'done' } => i.status === 'done')
          .map(({ cid, mimeType, size, alt, aspectRatio, previewDataUrl }) => ({
            cid,
            mimeType,
            size,
            alt,
            aspectRatio,
            previewDataUrl,
          }))
      );
    },
    [onChange]
  );

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const remaining = maxImages - itemsRef.current.length;
    const files = Array.from(fileList).slice(0, Math.max(0, remaining));

    const pending: LocalItem[] = files.map(() => ({
      localId: `pending-${++nextLocalId}`,
      cid: '',
      mimeType: '',
      size: 0,
      alt: '',
      status: 'uploading',
    }));
    emitChange([...itemsRef.current, ...pending]);

    await Promise.all(
      files.map(async (file, i) => {
        const localId = pending[i].localId;
        try {
          const prepared = await prepareImage(file);
          const result = await uploadPostImageAction(prepared.base64, prepared.mimeType);

          if (!result.success || !result.image) {
            throw new Error(result.error ?? 'Upload failed');
          }

          const next = itemsRef.current.map(item =>
            item.localId === localId
              ? {
                  ...item,
                  cid: result.image!.cid,
                  mimeType: result.image!.mimeType,
                  size: result.image!.size,
                  aspectRatio: { width: prepared.width, height: prepared.height },
                  previewUrl: prepared.previewUrl,
                  previewDataUrl: prepared.previewDataUrl,
                  status: 'done' as const,
                }
              : item
          );
          emitChange(next);
        } catch (err) {
          const next = itemsRef.current.map(item =>
            item.localId === localId
              ? { ...item, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' }
              : item
          );
          emitChange(next);
        }
      })
    );
  }

  function updateAlt(localId: string, alt: string) {
    emitChange(itemsRef.current.map(item => (item.localId === localId ? { ...item, alt } : item)));
  }

  function removeItem(localId: string) {
    emitChange(itemsRef.current.filter(item => item.localId !== localId));
  }

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expandedItem = items.find(i => i.localId === expandedId) ?? null;

  const canAddMore = items.length < maxImages && !disabled;

  return (
    <div style={{ marginTop: 8 }}>
      {items.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 8,
          }}
        >
          {items.map(item => {
            const previewSrc = item.previewUrl;
            const canExpand = !!previewSrc && item.status === 'done';

            return (
              <div
                key={item.localId}
                style={{
                  width: 120,
                  border: '1px solid var(--as-border)',
                  borderRadius: 'var(--as-radius-md)',
                  overflow: 'hidden',
                  background: 'var(--as-bg-header)',
                }}
              >
                <div style={{ position: 'relative', width: 120, height: 90, background: 'var(--as-border)' }}>
                  {previewSrc ? (
                    canExpand ? (
                      <button
                        type="button"
                        onClick={() => setExpandedId(item.localId)}
                        aria-label="View image at full size"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          padding: 0,
                          border: 'none',
                          background: 'none',
                          cursor: 'zoom-in',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={previewSrc}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                          }}
                        >
                          <ZoomIn size={12} />
                        </span>
                      </button>
                    ) : (
                      <img
                        src={previewSrc}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--as-text-xs)',
                        color: 'var(--as-text-muted)',
                        textAlign: 'center',
                        padding: 4,
                      }}
                    >
                      Image
                    </div>
                  )}

                  {item.status === 'uploading' && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--as-overlay)',
                      }}
                    >
                      <Loader2 size={20} color="var(--as-text)" className="animate-spin" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeItem(item.localId)}
                    aria-label="Remove image"
                    disabled={disabled}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      borderRadius: '50%',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ padding: 6 }}>
                  {item.status === 'error' ? (
                    <p
                      role="alert"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 4,
                        fontSize: 'var(--as-text-xs)',
                        color: 'var(--as-error)',
                        margin: 0,
                      }}
                    >
                      <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                      {item.error ?? 'Upload failed'}
                    </p>
                  ) : (
                    <>
                      <label
                        htmlFor={`${idPrefix}-alt-${item.localId}`}
                        style={{ display: 'block', fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', marginBottom: 2 }}
                      >
                        Alt text
                      </label>
                      <input
                        id={`${idPrefix}-alt-${item.localId}`}
                        type="text"
                        value={item.alt}
                        onChange={e => updateAlt(item.localId, e.target.value)}
                        placeholder="Describe this image"
                        disabled={disabled || item.status === 'uploading'}
                        className="upload-input-sm"
                        style={{ width: '100%', height: 28, padding: '0 6px' }}
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canAddMore && (
        <>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '8px 16px', minHeight: 'auto', fontSize: 'var(--as-text-sm)' }}
          >
            + Add Image{items.length > 0 ? '' : 's'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => {
              handleFiles(e.target.files);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
        </>
      )}

      {items.length >= maxImages && (
        <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', margin: '4px 0 0' }}>
          Up to {maxImages} images per post.
        </p>
      )}

      {expandedItem && (
        <Modal title="Image preview" onClose={() => setExpandedId(null)} maxWidth="800px">
          <img
            src={expandedItem.previewUrl}
            alt={expandedItem.alt || 'No alt text added yet'}
            style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 'var(--as-radius-md)' }}
          />
          <div style={{ marginTop: 'var(--as-gap)' }}>
            <label
              htmlFor={`${idPrefix}-alt-expanded-${expandedItem.localId}`}
              className="form-label"
            >
              Alt text
            </label>
            <input
              id={`${idPrefix}-alt-expanded-${expandedItem.localId}`}
              type="text"
              value={expandedItem.alt}
              onChange={e => updateAlt(expandedItem.localId, e.target.value)}
              placeholder="Describe this image"
              disabled={disabled}
              className="form-input"
            />
          </div>
        </Modal>
      )}
    </div>
  );
}