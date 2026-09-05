'use client';

import { useState } from 'react';
import { createPost, updatePostWithTargets, deletePost, publishPostNow } from '@/lib/actions/posts';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { BlueskyIcon, MastodonIcon } from '@/components/icons/Icons';

type Platform = 'bluesky' | 'mastodon';

interface ExistingPost {
  id: number;
  content: string;
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

function toDateTimeLocal(value: string | Date | null): string {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ComposePostDialog({ post, initialScheduledAt, onClose, onSaved }: ComposePostDialogProps) {
  const isEditing = !!post;
  const [content, setContent] = useState(post?.content ?? '');
  const [scheduledAt, setScheduledAt] = useState(
    toDateTimeLocal(post?.scheduledAt ?? initialScheduledAt ?? null)
  );
  const [platforms, setPlatforms] = useState<Set<Platform>>(
    new Set((post?.targets?.map(t => t.platform) ?? []) as Platform[])
  );
  const [saving, setSaving] = useState(false);
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

  const isDirty = isEditing
    ? content !== post!.content
      || toDateTimeLocal(post!.scheduledAt) !== scheduledAt
      || JSON.stringify([...platforms].sort()) !== JSON.stringify((post!.targets?.map(t => t.platform) ?? []).sort())
    : content.trim().length > 0 || platforms.size > 0;

  const canSave = content.trim().length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);

    const scheduledDate = scheduledAt ? new Date(scheduledAt) : undefined;

    if (isEditing) {
      await updatePostWithTargets(post!.id, {
        content: content.trim(),
        scheduledAt: scheduledDate,
        platforms: [...platforms],
      });
    } else {
      await createPost({
        content: content.trim(),
        scheduledAt: scheduledDate,
        platforms: [...platforms],
      });
    }

    setSaving(false);
    onSaved();
  }

  async function handleDelete() {
    if (!post) return;
    await deletePost(post.id);
    onSaved();
  }

  async function handlePublishNow() {
    if (!post) return;
    setConfirmingPublish(false);
    setPublishing(true);
    setPublishResult(null);
    const result = await publishPostNow(post.id);
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
            {isEditing && (
              <button className="btn btn--ghost" onClick={() => setConfirmingDelete(true)} style={{ marginRight: 'auto' }}>
                Delete
              </button>
            )}
            {isEditing && platforms.size > 0 && (
              <button className="btn btn--ghost" onClick={() => setConfirmingPublish(true)} disabled={publishing}>
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
        <div className="form-row">
          <label className="form-label" htmlFor="post-content">Content</label>
          <textarea
            id="post-content"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            placeholder="What do you want to say?"
            className="form-input"
          />
          <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', margin: 0 }}>
            {content.length} characters
          </p>
        </div>

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
          <label className="form-label" htmlFor="post-schedule">Schedule for (optional)</label>
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