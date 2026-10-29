'use client';

import { useState } from 'react';
import { createPost, updatePostWithTargets, deletePost, publishPostNow } from '@/lib/actions/posts';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { BlueskyIcon, MastodonIcon } from '@/components/icons/Icons';
import MentionTextarea from '@/components/admin/MentionTextarea';
import ImageAttachments, { type AttachedImage } from '@/components/admin/ImageAttachments';

type Platform = 'bluesky' | 'mastodon';

interface ExistingPost {
  id: number;
  content: string;
  threadParts?: string[] | null;
  images?: AttachedImage[][] | null;
  scheduledAt: string | Date | null;
  targets?: { platform: string }[];
}

interface ComposePostDialogProps {
  post?: ExistingPost | null;
  // Only used when creating a NEW post (post is null/undefined) - lets the
  // calendar pre-fill the schedule field when you click a specific day,
  // without affecting the "editing an existing post" logic at all.
  initialScheduledAt?: Date | string | null;
  onClose: () => void;
  onSaved: () => void;
}

const PLATFORM_ICON: Record<Platform, React.ComponentType<{ size?: number }>> = {
  bluesky: BlueskyIcon,
  mastodon: MastodonIcon,
};

// Bluesky's hard limit is 300 graphemes; Mastodon's default is 500. We
// count JS string length rather than graphemes, which is a close enough
// approximation for the plain-text/emoji-light content this composer is
// used for.
const PLATFORM_CHAR_LIMIT: Record<Platform, number> = {
  bluesky: 300,
  mastodon: 500,
};

function toDateTimeLocal(value: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ComposePostDialog({ post, initialScheduledAt, onClose, onSaved }: ComposePostDialogProps) {
  const isEditing = !!post;
  const [content, setContent] = useState(post?.content ?? '');
  const [threadParts, setThreadParts] = useState<string[]>(post?.threadParts ?? []);
  // Index-aligned with [content, ...threadParts] — imagesByPart[0] is
  // content's images, imagesByPart[i + 1] is threadParts[i]'s. Kept in
  // sync whenever a thread part is added or removed, below.
  const [imagesByPart, setImagesByPart] = useState<AttachedImage[][]>(
    // A per-part slot can come back from the database as null/undefined
    // (e.g. a part that was saved before it had any images) rather than
    // an empty array — normalize on load so nothing downstream has to
    // guard against it.
    () => (post?.images ?? []).map(part => part ?? [])
  );
  const [scheduledAt, setScheduledAt] = useState(
    toDateTimeLocal(post?.scheduledAt ?? initialScheduledAt ?? null)
  );
  const [platforms, setPlatforms] = useState<Set<Platform>>(
    new Set((post?.targets?.map(t => t.platform) ?? []) as Platform[])
  );
  const [saving, setSaving] = useState(false);
  // The database id of this post once it's been saved — present from the
  // start when editing, and set the moment a brand-new post's first save
  // succeeds. Tracked separately from `post` (which never changes after
  // the dialog opens) so Publish Now/Delete can work on a post created in
  // this same sitting without needing the dialog to reopen.
  const [savedPostId, setSavedPostId] = useState<number | null>(post?.id ?? null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);

  function togglePlatform(p: Platform) {
    setPlatforms(prev => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });
  }

  function addThreadPart() {
    setThreadParts(prev => [...prev, '']);
    setImagesByPart(prev => [...prev, []]);
  }

  function updateThreadPart(index: number, value: string) {
    setThreadParts(prev => prev.map((p, i) => (i === index ? value : p)));
  }

  function removeThreadPart(index: number) {
    setThreadParts(prev => prev.filter((_, i) => i !== index));
    // +1 here because imagesByPart[0] belongs to the main content, not
    // threadParts[0] — see the state declaration above.
    setImagesByPart(prev => prev.filter((_, i) => i !== index + 1));
  }

  function setImagesForPart(partIndex: number, images: AttachedImage[]) {
    setImagesByPart(prev => {
      const next = [...prev];
      // Pad with empty parts rather than letting a jump-ahead index leave
      // a hole — a hole survives a JSON round-trip as an actual null and
      // isn't caught by the ?? [] guards used when rendering/reading it.
      while (next.length <= partIndex) next.push([]);
      next[partIndex] = images;
      return next;
    });
  }

  // ImageAttachments only reports successfully-uploaded images here (see
  // its onChange), so every entry needs alt text before saving. Filtered
  // for Boolean first as a safety net against any null/undefined part
  // that might still be sitting in older saved data.
  const hasImageMissingAlt = imagesByPart.flat().filter(Boolean).some(img => !img.alt.trim());

  // The binding limit is whichever selected platform is strictest — a
  // thread posted to both Bluesky and Mastodon has to fit Bluesky's 300
  // as well as Mastodon's 500, so it has to fit the smaller of the two.
  // null (no limit shown/enforced) only when no platform is selected yet.
  const charLimit = platforms.size > 0 ? Math.min(...[...platforms].map(p => PLATFORM_CHAR_LIMIT[p])) : null;
  const isOverLimit = (text: string) => charLimit !== null && text.length > charLimit;
  const hasOverLimitContent = isOverLimit(content) || threadParts.some(isOverLimit);

  const isDirty = isEditing
    ? content !== post!.content
      || JSON.stringify(threadParts) !== JSON.stringify(post!.threadParts ?? [])
      || JSON.stringify(imagesByPart) !== JSON.stringify(post!.images ?? [])
      || toDateTimeLocal(post!.scheduledAt) !== scheduledAt
      || JSON.stringify([...platforms].sort()) !== JSON.stringify((post!.targets?.map(t => t.platform) ?? []).sort())
    : content.trim().length > 0 || threadParts.some(p => p.trim().length > 0) || platforms.size > 0 || allAttachedImagesCount() > 0;

  function allAttachedImagesCount() {
    return imagesByPart.reduce((n, part) => n + (part ?? []).length, 0);
  }

  const canSave = content.trim().length > 0 && !hasImageMissingAlt && !hasOverLimitContent;

  /**
   * Writes the form's current state to the database — creating the post
   * on its first call, updating it on every call after that (tracked via
   * savedPostId, not the isEditing/post prop, so this also works for a
   * post created earlier in this same sitting). Shared by both the Save
   * button and Publish Now — Publish Now used to call publishPostNow
   * directly against whatever was already saved, silently ignoring any
   * edits made since the post was last saved. Returns the post's id on
   * success, or false (without writing anything) if validation fails, so
   * callers can bail out instead of publishing stale or invalid content.
   */
  async function persistChanges(): Promise<number | false> {
    if (!canSave) return false;

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const cleanedThreadParts = threadParts.map(p => p.trim()).filter(p => p.length > 0);
    // Normalize before writing so a stray gap never gets persisted in the
    // first place — see the load-time normalization above for why this
    // matters (a hole survives a JSON round-trip as null).
    const cleanedImagesByPart = imagesByPart.map(part => part ?? []);

    if (savedPostId !== null) {
      await updatePostWithTargets(savedPostId, {
        content: content.trim(),
        threadParts: cleanedThreadParts,
        images: cleanedImagesByPart,
        scheduledAt: scheduledDate,
        platforms: [...platforms],
      });
      return savedPostId;
    }

    const created = await createPost({
      content: content.trim(),
      threadParts: cleanedThreadParts,
      images: cleanedImagesByPart,
      scheduledAt: scheduledDate,
      platforms: [...platforms],
    });
    setSavedPostId(created.id);
    return created.id;
  }

  async function handleSave() {
    setSaving(true);
    const id = await persistChanges();
    setSaving(false);
    if (id !== false) onSaved();
  }

  async function handleDelete() {
    if (savedPostId === null) return;
    await deletePost(savedPostId);
    onSaved();
  }

  async function handlePublishNow() {
    setConfirmingPublish(false);
    setPublishing(true);
    setPublishResult(null);

    // Always save the current form state first — otherwise this would
    // publish whatever's already in the database, ignoring any edits
    // made since the post was last saved (see persistChanges' doc
    // comment above). Works the same whether this post already existed
    // or is being created for the first time right now.
    const id = await persistChanges();
    if (id === false) {
      setPublishing(false);
      setPublishResult('Fix the errors above before publishing.');
      return;
    }

    const result = await publishPostNow(id);
    setPublishing(false);
    if (result.success) {
      onSaved();
    } else {
      setPublishResult('One or more platforms failed — check the post targets.');
    }
  }

  return (
    <>
      <Modal
        title={isEditing ? 'Edit Post' : 'New Post'}
        onClose={onClose}
        closeDisabled={saving}
        isDirty={isDirty}
        footer={
          <>
            {savedPostId !== null && (
              <button className="btn btn--ghost" onClick={() => setConfirmingDelete(true)} style={{ marginRight: 'auto' }}>
                Delete
              </button>
            )}
            {platforms.size > 0 && (
              <button className="btn btn--ghost" onClick={() => setConfirmingPublish(true)} disabled={publishing || saving || !canSave}>
                {publishing ? 'Publishing…' : 'Publish Now'}
              </button>
            )}
            <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn--primary" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save Post'}
            </button>
          </>
        }
      >
        {publishResult && (
          <p style={{ fontSize: 'var(--as-text-sm)', color: publishResult.startsWith('Published') ? 'var(--as-success)' : 'var(--as-error)', margin: '0 0 var(--as-gap)' }}>
            {publishResult}
          </p>
        )}

        {hasImageMissingAlt && (
          <p role="alert" style={{ fontSize: 'var(--as-text-sm)', color: 'var(--as-error)', margin: '0 0 var(--as-gap)' }}>
            Add alt text to every image before saving.
          </p>
        )}

        {hasOverLimitContent && (
          <p role="alert" style={{ fontSize: 'var(--as-text-sm)', color: 'var(--as-error)', margin: '0 0 var(--as-gap)' }}>
            {threadParts.length > 0 ? 'One or more posts are' : 'This post is'} over the {charLimit}-character limit for the selected platform{platforms.size > 1 ? 's' : ''}.
          </p>
        )}

        <div className="form-row">
          <div className="settings-row__label" id="platforms-label">Platforms</div>
          <div className="reason-list reason-list--compact" role="group" aria-labelledby="platforms-label">
            {(['bluesky', 'mastodon'] as Platform[]).map(p => {
              const Icon = PLATFORM_ICON[p];
              return (
                <label
                  key={p}
                  className={`reason-option reason-option--compact${platforms.has(p) ? ' reason-option--active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={platforms.has(p)}
                    onChange={() => togglePlatform(p)}
                    className="sr-only"
                  />
                  <span className="reason-option__label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon size={14} />
                    {p === 'bluesky' ? 'Bluesky' : 'Mastodon'}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="form-row">
          <label className="form-label" htmlFor="post-content">
            {threadParts.length > 0 ? 'Content (post 1 of ' + (threadParts.length + 1) + ')' : 'Content'}
          </label>
              <MentionTextarea
                id="post-content"
                value={content}
                onChange={setContent}
                rows={5}
                placeholder="What do you want to say?"
                className="form-input"
              />
          <p style={{ fontSize: 'var(--as-text-xs)', color: isOverLimit(content) ? 'var(--as-error)' : 'var(--as-text-muted)', margin: 0 }}>
            {content.length}{charLimit !== null ? ` / ${charLimit}` : ''} characters
          </p>
          <ImageAttachments
            idPrefix="post-content"
            images={imagesByPart[0] ?? []}
            onChange={images => setImagesForPart(0, images)}
            disabled={saving}
          />
        </div>

        {threadParts.map((part, i) => (
          <div className="form-row" key={i}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label className="form-label" htmlFor={`post-thread-part-${i}`}>
                Post {i + 2} of {threadParts.length + 1}
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() => removeThreadPart(i)}
                style={{ marginTop: 0, fontSize: 'var(--as-text-xs)' }}
              >
                Remove
              </button>
            </div>
                <MentionTextarea
                  id={`post-thread-part-${i}`}
                  value={part}
                  onChange={value => updateThreadPart(i, value)}
                  rows={4}
                  placeholder="Continue the thread…"
                  className="form-input"
                />
            <p style={{ fontSize: 'var(--as-text-xs)', color: isOverLimit(part) ? 'var(--as-error)' : 'var(--as-text-muted)', margin: 0 }}>
              {part.length}{charLimit !== null ? ` / ${charLimit}` : ''} characters
            </p>
            <ImageAttachments
              idPrefix={`post-thread-part-${i}`}
              images={imagesByPart[i + 1] ?? []}
              onChange={images => setImagesForPart(i + 1, images)}
              disabled={saving}
            />
          </div>
        ))}

        <div className="form-row">
          <button type="button" className="btn btn--ghost" onClick={addThreadPart}>
            + Add Post to Thread
          </button>
          {threadParts.length > 0 && (
            <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', margin: '8px 0 0' }}>
              Posted as a connected thread — each part replies to the one before it, in order, at the scheduled time.
            </p>
          )}
        </div>

        <div className="form-row">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label className="form-label" htmlFor="post-schedule">Schedule for (optional)</label>
            {scheduledAt && (
              <button
                type="button"
                className="text-link"
                onClick={() => setScheduledAt('')}
                style={{ marginTop: 0, fontSize: 'var(--as-text-xs)' }}
              >
                Clear
              </button>
            )}
          </div>
          <input
            id="post-schedule"
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="form-input"
          />
          <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', margin: 0 }}>
            Leave blank to save as a draft.
          </p>
        </div>
      </Modal>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete Post?"
          message={'This can’t be undone.'}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      {confirmingPublish && (
        <ConfirmDialog
          title="Publish Now?"
          message={'This will post immediately to the selected platforms, regardless of the scheduled date. This can’t be undone.'}
          confirmLabel="Publish"
          onConfirm={handlePublishNow}
          onCancel={() => setConfirmingPublish(false)}
        />
      )}
    </>
  );
}