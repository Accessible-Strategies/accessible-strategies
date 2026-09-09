'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import DOMPurify from 'dompurify';
import { Heart, Repeat2, MessageCircle, Loader2, Share2, MoreHorizontal, Copy, VolumeX, EyeOff, ExternalLink, Bookmark, ChevronDown } from 'lucide-react';
import VideoPlayer from '@/components/admin/VideoPlayer';
import { parseBlueskyFacets } from '@/lib/utils/parseBlueskyFacets';
import BaseDropdown from '@/components/ui/BaseDropdown';
import ProfileDialog from '@/components/admin/ProfileDialog';

interface LinkCard {
  uri:                string;
  title:              string;
  description:        string;
  thumbUrl?:          string;
}

interface QuotedPost {
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string;
  url:                string;
  images?:            { url: string; alt: string }[];
  video?:             { url: string; alt: string; thumbnail?: string; isHls: boolean };
  link?:              LinkCard;
}

export interface FeedPost {
  externalId:        string;
  cid?:               string; // required for like/repost/reply — Bluesky only, for now
  authorDid?:         string; // required for mute — Bluesky only, for now
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string;
  url:                string;
  createdAt:          string | Date;
  images?:            { url: string; alt: string }[];
  video?:             { url: string; alt: string; thumbnail?: string; isHls: boolean };
  facets?:            any[];
  replyTo?:           {
    authorHandle: string;
    authorDisplayName: string;
    content: string;
    images?: { url: string; alt: string }[];
    video?: { url: string; alt: string; thumbnail?: string; isHls: boolean };
  };
  repostedBy?:        { authorHandle: string; authorDisplayName: string };
  quoted?:            QuotedPost;
  link?:              LinkCard;
  /** Replies to this post that were also present in the fetched batch —
   *  rendered as an indented thread beneath this card. */
  replies?:           FeedPost[];
  replyCount?:        number;
  repostCount?:        number;
  likeCount?:         number;
  viewer?:            { likeUri?: string; repostUri?: string };
  threadRoot?:        { uri: string; cid: string };
  saved?:             boolean;
}

/** Actions that make the interaction bar live instead of just links out
 *  to the platform. Optional — a platform without write support yet
 *  (Mastodon, for now) simply renders without the bar being interactive. */
export interface FeedActions {
  like: (uri: string, cid: string) => Promise<{ success: boolean; likeUri?: string; error?: string }>;
  unlike: (likeUri: string) => Promise<{ success: boolean; error?: string }>;
  repost: (uri: string, cid: string) => Promise<{ success: boolean; repostUri?: string; error?: string }>;
  unrepost: (repostUri: string) => Promise<{ success: boolean; error?: string }>;
  reply: (
    text: string,
    root: { uri: string; cid: string },
    parent: { uri: string; cid: string }
  ) => Promise<{ success: boolean; postUrl?: string; error?: string }>;
  /** Optional — mute isn't required for the interaction bar to work, but
   *  enables the "Mute account" item in the post menu when provided. */
  mute?: (did: string) => Promise<{ success: boolean; error?: string }>;
  /** Optional — fetches the full reply tree for a single post (beyond
   *  whatever replies happened to land in the same feed batch), enabling
   *  the "View full thread" expansion. */
  fetchThread?: (uri: string) => Promise<FeedPost[]>;
}

/** Save/bookmark a post for later reference — a local admin-side DB row,
 *  independent of any platform's own bookmark feature. Available for any
 *  platform (Bluesky or Mastodon) since it doesn't require write access
 *  to the platform itself. */
export interface FeedSaveActions {
  save: (post: {
    externalId: string;
    authorHandle?: string;
    authorDisplayName?: string;
    content?: string;
    url?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  unsave: (externalId: string) => Promise<{ success: boolean; error?: string }>;
  listSavedIds: () => Promise<string[]>;
}

function BlueskyContent({ text, facets }: { text: string; facets?: any[] }) {
  const segments = parseBlueskyFacets(text, facets);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--as-heading)' }}>
            {seg.text}
          </a>
        )
      )}
    </>
  );
}

function MastodonContent({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'a', 'span', 'strong', 'em', 'b', 'i'],
    ALLOWED_ATTR: ['href', 'rel', 'target', 'class'],
  });
  return <span dangerouslySetInnerHTML={{ __html: clean }} />;
}

/** An external-site link preview — thumbnail, title, description, and
 *  domain, matching Bluesky's own rich-link card for a shared URL. */
function LinkCardView({ link }: { link: LinkCard }) {
  let domain = link.uri;
  try { domain = new URL(link.uri).hostname; } catch { /* keep raw uri as fallback */ }

  return (
    <a
      href={link.uri}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        border: '1px solid var(--as-border)',
        borderRadius: 'var(--as-radius-md)',
        overflow: 'hidden',
        margin: '8px 0',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      {link.thumbUrl && (
        <img
          src={link.thumbUrl}
          alt=""
          style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }}
        />
      )}
      <div style={{ padding: '10px 12px' }}>
        <p style={{ margin: 0, fontSize: 'var(--as-text-sm)', fontWeight: 600 }}>{link.title}</p>
        {link.description && (
          <p style={{
            margin: '4px 0 0',
            fontSize: 'var(--as-text-xs)',
            color: 'var(--as-text-muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {link.description}
          </p>
        )}
        <p style={{ margin: '4px 0 0', fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)' }}>{domain}</p>
      </div>
    </a>
  );
}

/** A quote-embed: another post nested inside this one, exactly as
 *  Bluesky itself renders it — its own author line, text, and media. */
function QuotedPostCard({ quoted }: { quoted: QuotedPost }) {
  return (
    <div style={{
      border: '1px solid var(--as-border)',
      borderRadius: 'var(--as-radius-md)',
      padding: '10px 12px',
      margin: '8px 0',
    }}>
      <p style={{ margin: 0, fontSize: 'var(--as-text-sm)' }}>
        <strong>{quoted.authorDisplayName}</strong>{' '}
        <span style={{ color: 'var(--as-text-muted)' }}>@{quoted.authorHandle}</span>
      </p>
      {quoted.content && (
        <p style={{ fontSize: 'var(--as-text-sm)', margin: '4px 0', whiteSpace: 'pre-wrap' }}>{quoted.content}</p>
      )}

      {quoted.images && quoted.images.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0 0' }}>
          {quoted.images.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt={img.alt}
              style={{ width: '100%', maxWidth: quoted.images!.length > 1 ? '48%' : '100%', height: 'auto', borderRadius: 'var(--as-radius-md)', objectFit: 'cover' }}
            />
          ))}
        </div>
      )}

      {quoted.video && (
        <div style={{ margin: '8px 0 0' }}>
          <VideoPlayer src={quoted.video.url} isHls={quoted.video.isHls} alt={quoted.video.alt} thumbnail={quoted.video.thumbnail} />
        </div>
      )}

      {quoted.link && <LinkCardView link={quoted.link} />}

      <a href={quoted.url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ fontSize: 'var(--as-text-xs)', display: 'inline-block', marginTop: '6px' }}>
        View on Bluesky →
      </a>
    </div>
  );
}

const iconBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  minHeight: '44px',
  minWidth: '44px',
  padding: '0 10px',
  border: 'none',
  background: 'transparent',
  borderRadius: 'var(--as-radius-md)',
  color: 'var(--as-text-muted)',
  fontSize: 'var(--as-text-xs)',
  cursor: 'pointer',
};

/** Copies text to the clipboard, with a document.execCommand fallback
 *  for contexts where the async Clipboard API isn't available (e.g. a
 *  non-HTTPS dev origin). Returns whether it succeeded. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

/** The ⋯ overflow menu — copy post text, mute account, hide post for
 *  me. Built on BaseDropdown so it gets the same portal rendering,
 *  Focus & Overlay dim/blur treatment, and Escape-stack behavior as
 *  every other dropdown in the admin — rather than a one-off popup that
 *  can get trapped inside a card's stacking context. Deliberately
 *  excludes block/report/translate/mute-thread/mute-words for now —
 *  those carry real moderation consequences or need dedicated review
 *  before automating. */
function PostMenu({
  post,
  platformLabel,
  actions,
  onHide,
}: {
  post: FeedPost;
  platformLabel: string;
  actions?: FeedActions;
  onHide: () => void;
}) {
  const [status, setStatus] = useState<string | null>(null);

  async function handleCopy(close: () => void) {
    const ok = await copyToClipboard(post.content);
    setStatus(ok ? 'Copied' : 'Copy failed');
    setTimeout(() => setStatus(null), 1500);
    close();
  }

  async function handleMute(close: () => void) {
    if (!actions?.mute || !post.authorDid) return;
    const result = await actions.mute(post.authorDid);
    setStatus(result.success ? `Muted @${post.authorHandle}` : (result.error ?? 'Mute failed'));
    setTimeout(() => setStatus(null), 2000);
    close();
  }

  function handleHide(close: () => void) {
    close();
    onHide();
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <BaseDropdown
        label={`More options for post by ${post.authorDisplayName}`}
        minWidth="200px"
        trigger={() => <MoreHorizontal size={16} aria-hidden="true" />}
      >
        {(close: () => void) => (
          <>
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={close}
              style={{ ...menuItemStyle, textDecoration: 'none' }}
            >
              <ExternalLink size={16} aria-hidden="true" /> {`View on ${platformLabel}`}
            </a>
            <button type="button" role="menuitem" onClick={() => handleCopy(close)} style={menuItemStyle}>
              <Copy size={16} aria-hidden="true" /> Copy post text
            </button>
            {actions?.mute && post.authorDid && (
              <button type="button" role="menuitem" onClick={() => handleMute(close)} style={menuItemStyle}>
                <VolumeX size={16} aria-hidden="true" /> Mute @{post.authorHandle}
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => handleHide(close)} style={menuItemStyle}>
              <EyeOff size={16} aria-hidden="true" /> Hide post for me
            </button>
          </>
        )}
      </BaseDropdown>

      {status && (
        <p role="status" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', whiteSpace: 'nowrap' }}>
          {status}
        </p>
      )}
    </div>
  );
}

const menuItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  minHeight: '44px',
  padding: '0 10px',
  border: 'none',
  background: 'transparent',
  color: 'var(--as-text)',
  fontSize: 'var(--as-text-sm)',
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: 'var(--as-radius-sm, 4px)',
};

/** Reply / Repost / Like / Share / ⋯ bar. Reply/repost/like render as
 *  live, actionable buttons when `actions` + `post.cid` are available
 *  (currently Bluesky only); otherwise falls back to plain,
 *  non-interactive counts so Mastodon posts don't show broken buttons
 *  before Phase 3 wires up its own connector actions. Share and the
 *  ⋯ menu work regardless, since they don't need platform write access. */
function InteractionBar({
  post,
  platformLabel,
  actions,
  saveActions,
  onChange,
  onToggleReply,
  onHide,
  replyOpen,
}: {
  post: FeedPost;
  platformLabel: string;
  actions?: FeedActions;
  saveActions?: FeedSaveActions;
  onChange: (patch: Partial<FeedPost>) => void;
  onToggleReply: () => void;
  onHide: () => void;
  replyOpen: boolean;
}) {
  const [busy, setBusy] = useState<'like' | 'repost' | 'save' | null>(null);
  const canAct = !!actions && !!post.cid;

  async function toggleLike() {
    if (!canAct || busy) return;
    setBusy('like');
    const wasLiked = !!post.viewer?.likeUri;
    onChange({
      viewer: { ...post.viewer, likeUri: wasLiked ? undefined : 'pending' },
      likeCount: (post.likeCount ?? 0) + (wasLiked ? -1 : 1),
    });
    const result = wasLiked
      ? await actions!.unlike(post.viewer!.likeUri!)
      : await actions!.like(post.externalId, post.cid!);
    if (!result.success) {
      onChange({ viewer: post.viewer, likeCount: post.likeCount });
    } else if (!wasLiked) {
      onChange({ viewer: { ...post.viewer, likeUri: (result as any).likeUri } });
    }
    setBusy(null);
  }

  async function toggleRepost() {
    if (!canAct || busy) return;
    setBusy('repost');
    const wasReposted = !!post.viewer?.repostUri;
    onChange({
      viewer: { ...post.viewer, repostUri: wasReposted ? undefined : 'pending' },
      repostCount: (post.repostCount ?? 0) + (wasReposted ? -1 : 1),
    });
    const result = wasReposted
      ? await actions!.unrepost(post.viewer!.repostUri!)
      : await actions!.repost(post.externalId, post.cid!);
    if (!result.success) {
      onChange({ viewer: post.viewer, repostCount: post.repostCount });
    } else if (!wasReposted) {
      onChange({ viewer: { ...post.viewer, repostUri: (result as any).repostUri } });
    }
    setBusy(null);
  }

  const liked = !!post.viewer?.likeUri;
  const reposted = !!post.viewer?.repostUri;
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  async function handleShare() {
    const ok = await copyToClipboard(post.url);
    setShareStatus(ok ? 'Link copied' : 'Copy failed');
    setTimeout(() => setShareStatus(null), 1500);
  }

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  async function toggleSave() {
    if (!saveActions || busy) return;
    setBusy('save');
    const wasSaved = !!post.saved;
    onChange({ saved: !wasSaved });
    const result = wasSaved
      ? await saveActions.unsave(post.externalId)
      : await saveActions.save({
          externalId: post.externalId,
          authorHandle: post.authorHandle,
          authorDisplayName: post.authorDisplayName,
          content: post.content,
          url: post.url,
        });
    if (!result.success) {
      onChange({ saved: wasSaved });
      setSaveStatus(result.error ?? 'Save failed');
    } else {
      setSaveStatus(wasSaved ? 'Removed' : 'Saved');
    }
    setTimeout(() => setSaveStatus(null), 1500);
    setBusy(null);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
      <button
        type="button"
        onClick={onToggleReply}
        aria-label="Reply"
        aria-expanded={replyOpen}
        style={iconBtnStyle}
      >
        <MessageCircle size={16} aria-hidden="true" />
        {post.replyCount ?? 0}
      </button>

      <button
        type="button"
        onClick={toggleRepost}
        disabled={!canAct || busy === 'repost'}
        aria-label={reposted ? 'Undo repost' : 'Repost'}
        aria-pressed={reposted}
        style={{ ...iconBtnStyle, color: reposted ? 'var(--as-success, #2e9e5b)' : iconBtnStyle.color }}
      >
        {busy === 'repost' ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <Repeat2 size={16} aria-hidden="true" />}
        {post.repostCount ?? 0}
      </button>

      <button
        type="button"
        onClick={toggleLike}
        disabled={!canAct || busy === 'like'}
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
        style={{ ...iconBtnStyle, color: liked ? 'var(--as-error, #d1435b)' : iconBtnStyle.color }}
      >
        {busy === 'like'
          ? <Loader2 size={16} className="spin" aria-hidden="true" />
          : <Heart size={16} fill={liked ? 'currentColor' : 'none'} aria-hidden="true" />}
        {post.likeCount ?? 0}
      </button>

      {saveActions && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
          <button
            type="button"
            onClick={toggleSave}
            disabled={busy === 'save'}
            aria-label={post.saved ? 'Remove bookmark' : 'Save post'}
            aria-pressed={!!post.saved}
            style={{ ...iconBtnStyle, color: post.saved ? 'var(--as-heading)' : iconBtnStyle.color }}
          >
            <Bookmark size={16} fill={post.saved ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
          {saveStatus && (
            <p role="status" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', whiteSpace: 'nowrap' }}>
              {saveStatus}
            </p>
          )}
        </div>
      )}

      <div style={{ marginLeft: saveActions ? undefined : 'auto', position: 'relative', display: 'flex', alignItems: 'center' }}>
        <button type="button" onClick={handleShare} aria-label="Copy link to this post" style={iconBtnStyle}>
          <Share2 size={16} aria-hidden="true" />
        </button>
        {shareStatus && (
          <p role="status" style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', whiteSpace: 'nowrap' }}>
            {shareStatus}
          </p>
        )}
      </div>

      <PostMenu post={post} platformLabel={platformLabel} actions={actions} onHide={onHide} />
    </div>
  );
}

/** Recursively renders a fetched-on-demand reply tree ("View full
 *  thread"), independent of the shallow same-batch grouping done by
 *  groupIntoThreads() on the server. Each level indents a bit further,
 *  capped so very deep threads don't run off the edge of the card. */
function ThreadReplies({
  replies,
  platformLabel,
  actions,
  saveActions,
  depth,
  onAuthorClick,
}: {
  replies: FeedPost[];
  platformLabel: string;
  actions?: FeedActions;
  saveActions?: FeedSaveActions;
  depth: number;
  onAuthorClick?: (handle: string) => void;
}) {
  const [items, setItems] = useState(replies);
  const indent = Math.min(depth, 4) * 20;

  function patch(externalId: string, p: Partial<FeedPost>) {
    setItems(prev => prev.map(r => (r.externalId === externalId ? { ...r, ...p } : r)));
  }

  function hide(externalId: string) {
    setItems(prev => prev.filter(r => r.externalId !== externalId));
  }

  return (
    <div style={{
      marginLeft: `${indent}px`,
      borderLeft: '2px solid var(--as-border)',
      paddingLeft: '12px',
      marginTop: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      {items.map(reply => (
        <div key={reply.externalId}>
          <PostCard
            post={reply}
            platformLabel={platformLabel}
            actions={actions}
            saveActions={saveActions}
            onChange={p => patch(reply.externalId, p)}
            onHide={() => hide(reply.externalId)}
            onAuthorClick={onAuthorClick}
          />
          {reply.replies && reply.replies.length > 0 && (
            <ThreadReplies
              replies={reply.replies}
              platformLabel={platformLabel}
              actions={actions}
              saveActions={saveActions}
              depth={depth + 1}
              onAuthorClick={onAuthorClick}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/** Inline reply composer — appears under a post when its Reply button
 *  is toggled. Posts via `actions.reply` using the post's own
 *  {uri, cid} as the parent and its `threadRoot` as the thread root. */
function ReplyComposer({
  post,
  actions,
  onDone,
}: {
  post: FeedPost;
  actions: FeedActions;
  onDone: () => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!text.trim() || !post.cid) return;
    setSending(true);
    setError(null);
    const root = post.threadRoot ?? { uri: post.externalId, cid: post.cid };
    const result = await actions.reply(text.trim(), root, { uri: post.externalId, cid: post.cid });
    setSending(false);
    if (result.success) {
      setText('');
      onDone();
    } else {
      setError(result.error ?? 'Reply failed.');
    }
  }

  return (
    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--as-border)', width: '100%', alignSelf: 'stretch' }}>
      <label htmlFor={`reply-${post.externalId}`} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        Reply to {post.authorDisplayName}
      </label>
      <textarea
        id={`reply-${post.externalId}`}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Reply to ${post.authorDisplayName}…`}
        rows={3}
        style={{
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          alignSelf: 'stretch',
          resize: 'vertical',
          background: 'var(--as-bg)',
          color: 'var(--as-text)',
          border: '1px solid var(--as-border)',
          borderRadius: 'var(--as-radius-md)',
          padding: '8px 10px',
          fontSize: 'var(--as-text-sm)',
        }}
      />
      {error && (
        <p style={{ color: 'var(--as-error)', fontSize: 'var(--as-text-xs)', margin: '4px 0 0' }}>{error}</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
        <button type="button" className="btn" onClick={onDone} disabled={sending}>Cancel</button>
        <button type="button" className="btn btn--primary" onClick={submit} disabled={sending || !text.trim()}>
          {sending ? 'Sending…' : 'Reply'}
        </button>
      </div>
    </div>
  );
}

/** Renders a single post's card content — author line, body, media,
 *  reply-context snippet, quote-embed, and the interaction bar. Reused
 *  for both top-level (root) posts and their nested replies so both
 *  look identical aside from indentation, which the caller controls.
 *  Also reused read-only (no actions/saveActions) inside ProfileDialog
 *  to show an author's own post history. */
export function PostCard({
  post,
  platformLabel,
  actions,
  saveActions,
  onChange,
  onHide,
  onAuthorClick,
}: {
  post: FeedPost;
  platformLabel: string;
  actions?: FeedActions;
  saveActions?: FeedSaveActions;
  onChange: (patch: Partial<FeedPost>) => void;
  onHide: () => void;
  onAuthorClick?: (handle: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [thread, setThread] = useState<FeedPost[] | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const alreadyShown = post.replies?.length ?? 0;
  const hasMoreReplies = (post.replyCount ?? 0) > alreadyShown;

  async function loadThread() {
    if (!actions?.fetchThread || threadLoading) return;
    setThreadLoading(true);
    try {
      const result = await actions.fetchThread(post.externalId);
      setThread(result);
    } finally {
      setThreadLoading(false);
    }
  }

  return (
    <div className="card">
      {post.repostedBy && (
        <p style={{ fontSize: 'var(--as-text-xs)', color: 'var(--as-text-muted)', margin: '0 0 6px' }}>
          {`🔁 Reposted by ${post.repostedBy.authorDisplayName}`}
        </p>
      )}
      {post.replyTo && (
        <div style={{
          fontSize: 'var(--as-text-xs)',
          color: 'var(--as-text-muted)',
          background: 'var(--as-bg-subtle, color-mix(in srgb, var(--as-bg) 92%, var(--as-text) 8%))',
          border: '1px solid var(--as-border)',
          borderRadius: 'var(--as-radius-md)',
          padding: '8px 10px',
          marginBottom: '10px',
        }}>
          <p style={{ margin: 0 }}>
            Replying to <strong>{post.replyTo.authorDisplayName}</strong> @{post.replyTo.authorHandle}
          </p>
          {post.replyTo.content && (
            <p style={{ margin: '2px 0 0', whiteSpace: 'pre-wrap' }}>{post.replyTo.content}</p>
          )}

          {post.replyTo.images && post.replyTo.images.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0 0' }}>
              {post.replyTo.images.map((img, i) => (
                <img
                  key={i}
                  src={img.url}
                  alt={img.alt}
                  style={{ width: '100%', maxWidth: post.replyTo!.images!.length > 1 ? '48%' : '100%', height: 'auto', borderRadius: 'var(--as-radius-md)', objectFit: 'cover' }}
                />
              ))}
            </div>
          )}

          {post.replyTo.video && (
            <div style={{ margin: '8px 0 0' }}>
              <VideoPlayer src={post.replyTo.video.url} isHls={post.replyTo.video.isHls} alt={post.replyTo.video.alt} thumbnail={post.replyTo.video.thumbnail} />
            </div>
          )}
        </div>
      )}
      <p style={{ margin: 0, fontSize: 'var(--as-text-sm)' }}>
        {onAuthorClick ? (
          <button
            type="button"
            onClick={() => onAuthorClick(post.authorHandle)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}
          >
            <strong>{post.authorDisplayName}</strong>{' '}
            <span style={{ color: 'var(--as-text-muted)' }}>@{post.authorHandle}</span>
          </button>
        ) : (
          <>
            <strong>{post.authorDisplayName}</strong>{' '}
            <span style={{ color: 'var(--as-text-muted)' }}>@{post.authorHandle}</span>
          </>
        )}
      </p>
      <p style={{ fontSize: 'var(--as-text-sm)', margin: '4px 0', whiteSpace: 'pre-wrap' }}>
        {platformLabel === 'Bluesky'
          ? <BlueskyContent text={post.content} facets={post.facets} />
          : <MastodonContent html={post.content} />}
      </p>

      {post.images && post.images.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '8px 0' }}>
          {post.images.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt={img.alt}
              style={{ width: '100%', maxWidth: post.images!.length > 1 ? '48%' : '100%', height: 'auto', borderRadius: 'var(--as-radius-md)', objectFit: 'cover' }}
            />
          ))}
        </div>
      )}

      {post.video && (
        <div style={{ margin: '8px 0' }}>
          <VideoPlayer src={post.video.url} isHls={post.video.isHls} alt={post.video.alt} thumbnail={post.video.thumbnail} />
        </div>
      )}

      {post.link && <LinkCardView link={post.link} />}

      {post.quoted && <QuotedPostCard quoted={post.quoted} />}

      <InteractionBar
        post={post}
        platformLabel={platformLabel}
        actions={actions}
        saveActions={saveActions}
        onChange={onChange}
        onToggleReply={() => setReplyOpen(o => !o)}
        onHide={onHide}
        replyOpen={replyOpen}
      />

      {replyOpen && actions && (
        <ReplyComposer
          post={post}
          actions={actions}
          onDone={() => {
            setReplyOpen(false);
            onChange({ replyCount: (post.replyCount ?? 0) + 1 });
          }}
        />
      )}

      {actions?.fetchThread && hasMoreReplies && !thread && (
        <button
          type="button"
          onClick={loadThread}
          disabled={threadLoading}
          style={{ ...iconBtnStyle, marginTop: '4px', color: 'var(--as-heading)' }}
        >
          {threadLoading
            ? <Loader2 size={14} className="spin" aria-hidden="true" />
            : <ChevronDown size={14} aria-hidden="true" />}
          {threadLoading ? 'Loading thread…' : `View full thread (${post.replyCount})`}
        </button>
      )}

      {thread && thread.length > 0 && (
        <ThreadReplies replies={thread} platformLabel={platformLabel} actions={actions} saveActions={saveActions} depth={0} onAuthorClick={onAuthorClick} />
      )}
    </div>
  );
}

/** A root post plus any of its replies that were grouped alongside it —
 *  root card on top, replies indented beneath with a connecting thread
 *  line, matching Bluesky's own thread layout. */
function ThreadBlock({
  post,
  platformLabel,
  actions,
  saveActions,
  onChangeRoot,
  onChangeReply,
  onHideRoot,
  onHideReply,
  onAuthorClick,
}: {
  post: FeedPost;
  platformLabel: string;
  actions?: FeedActions;
  saveActions?: FeedSaveActions;
  onChangeRoot: (patch: Partial<FeedPost>) => void;
  onChangeReply: (replyExternalId: string, patch: Partial<FeedPost>) => void;
  onHideRoot: () => void;
  onHideReply: (replyExternalId: string) => void;
  onAuthorClick?: (handle: string) => void;
}) {
  return (
    <div>
      <PostCard post={post} platformLabel={platformLabel} actions={actions} saveActions={saveActions} onChange={onChangeRoot} onHide={onHideRoot} onAuthorClick={onAuthorClick} />
      {post.replies && post.replies.length > 0 && (
        <div style={{
          marginLeft: '28px',
          borderLeft: '2px solid var(--as-border)',
          paddingLeft: '12px',
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          {post.replies.map(reply => (
            <PostCard
              key={reply.externalId}
              post={reply}
              platformLabel={platformLabel}
              actions={actions}
              saveActions={saveActions}
              onChange={patch => onChangeReply(reply.externalId, patch)}
              onHide={() => onHideReply(reply.externalId)}
              onAuthorClick={onAuthorClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** A fetchFeed implementation can return either a bare array (Mastodon,
 *  no pagination wired up yet) or a { posts, nextCursor } page (Bluesky).
 *  Normalizing here lets PlatformFeedView support "Load more" for
 *  whichever platforms actually provide a cursor, without breaking the
 *  ones that don't yet. */
type FeedResult = FeedPost[] | { posts: FeedPost[]; nextCursor?: string };

function normalizeFeedResult(result: FeedResult): { posts: FeedPost[]; nextCursor?: string } {
  return Array.isArray(result) ? { posts: result, nextCursor: undefined } : result;
}

export default function PlatformFeedView({
  platformLabel,
  fetchFeed,
  actions,
  saveActions,
  feedName: feedNameProp,
}: {
  platformLabel: string;
  fetchFeed: (cursor?: string) => Promise<FeedResult>;
  /** Optional live actions (like/repost/reply). Omit for platforms that
   *  don't have write support wired up yet — the feed still renders,
   *  just without interactive buttons. */
  actions?: FeedActions;
  /** Optional save/bookmark — independent of platform write access, so
   *  it can be enabled for any platform once its DB-backed actions are
   *  wired up in the page. */
  saveActions?: FeedSaveActions;
  /** Overrides the default "Following"/"Home" header label — used when
   *  the page hosts multiple selectable feeds (Bluesky's pinned custom
   *  feeds) and wants the header to reflect whichever one is active. */
  feedName?: string;
}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);

  const feedName = feedNameProp ?? (platformLabel === 'Bluesky' ? 'Following' : 'Home');

  function markSaved(items: FeedPost[], savedIds: Set<string>): FeedPost[] {
    return items.map(p => ({
      ...p,
      saved: savedIds.has(p.externalId),
      replies: p.replies ? markSaved(p.replies, savedIds) : p.replies,
    }));
  }

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([fetchFeed(), saveActions ? saveActions.listSavedIds() : Promise.resolve<string[]>([])])
      .then(([result, savedIds]) => {
        const { posts: fetched, nextCursor } = normalizeFeedResult(result);
        setPosts(saveActions ? markSaved(fetched, new Set(savedIds)) : fetched);
        setCursor(nextCursor);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }

  function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    Promise.all([fetchFeed(cursor), saveActions ? saveActions.listSavedIds() : Promise.resolve<string[]>([])])
      .then(([result, savedIds]) => {
        const { posts: fetched, nextCursor } = normalizeFeedResult(result);
        const marked = saveActions ? markSaved(fetched, new Set(savedIds)) : fetched;
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.externalId));
          return [...prev, ...marked.filter(p => !existingIds.has(p.externalId))];
        });
        setCursor(nextCursor);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoadingMore(false));
  }

  useEffect(() => { load(); }, []);

  function patchRoot(externalId: string, patch: Partial<FeedPost>) {
    setPosts(prev => prev.map(p => (p.externalId === externalId ? { ...p, ...patch } : p)));
  }

  function patchReply(rootExternalId: string, replyExternalId: string, patch: Partial<FeedPost>) {
    setPosts(prev => prev.map(p => {
      if (p.externalId !== rootExternalId || !p.replies) return p;
      return {
        ...p,
        replies: p.replies.map(r => (r.externalId === replyExternalId ? { ...r, ...patch } : r)),
      };
    }));
  }

  // "Hide post for me" — removes it from THIS session's view only.
  // Not persisted (refreshing the feed brings it back) — a lightweight
  // client-side declutter, not moderation.
  function hideRoot(externalId: string) {
    setPosts(prev => prev.filter(p => p.externalId !== externalId));
  }

  function hideReply(rootExternalId: string, replyExternalId: string) {
    setPosts(prev => prev.map(p => {
      if (p.externalId !== rootExternalId || !p.replies) return p;
      return { ...p, replies: p.replies.filter(r => r.externalId !== replyExternalId) };
    }));
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--as-gap)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--as-text-md)', fontWeight: 600}}>
          {platformLabel} — {feedName}
        </h2>
        <button className="btn btn--primary" onClick={load} disabled={loading}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p style={{ color: 'var(--as-error)', fontSize: 'var(--as-text-sm)', marginBottom: 'var(--as-gap)' }}>
          {error}
        </p>
      )}

      {loading ? (
        <p style={{ color: 'var(--as-text-muted)' }}>Loading…</p>
      ) : posts.length === 0 ? (
        <p style={{ color: 'var(--as-text-muted)' }}>Nothing to show.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {posts.map(post => (
            <ThreadBlock
              key={post.externalId}
              post={post}
              platformLabel={platformLabel}
              actions={actions}
              saveActions={saveActions}
              onChangeRoot={patch => patchRoot(post.externalId, patch)}
              onChangeReply={(replyId, patch) => patchReply(post.externalId, replyId, patch)}
              onHideRoot={() => hideRoot(post.externalId)}
              onHideReply={replyId => hideReply(post.externalId, replyId)}
              onAuthorClick={platformLabel === 'Bluesky' ? handle => setProfileHandle(handle) : undefined}
            />
          ))}

          {cursor && (
            <button
              className="btn"
              onClick={loadMore}
              disabled={loadingMore}
              style={{ alignSelf: 'center', marginTop: '8px' }}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}

      {profileHandle && (
        <ProfileDialog handle={profileHandle} onClose={() => setProfileHandle(null)} />
      )}
    </>
  );
}