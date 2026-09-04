'use client';

import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import VideoPlayer from '@/components/admin/VideoPlayer';
import { parseBlueskyFacets } from '@/lib/utils/parseBlueskyFacets';

interface QuotedPost {
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string;
  url:                string;
  images?:            { url: string; alt: string }[];
  video?:             { url: string; alt: string; thumbnail?: string; isHls: boolean };
}

interface FeedPost {
  externalId:        string;
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string;
  url:                string;
  createdAt:          string | Date;
  images?:            { url: string; alt: string }[];
  video?:             { url: string; alt: string; thumbnail?: string; isHls: boolean };
  facets?:            any[];
  replyTo?:           { authorHandle: string; authorDisplayName: string; content: string };
  repostedBy?:        { authorHandle: string; authorDisplayName: string };
  quoted?:            QuotedPost;
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
        <p style={{ fontSize: 'var(--as-text-sm)', margin: '4px 0' }}>{quoted.content}</p>
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

      <a href={quoted.url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ fontSize: 'var(--as-text-xs)', display: 'inline-block', marginTop: '6px' }}>
        View on Bluesky →
      </a>
    </div>
  );
}

export default function PlatformFeedView({
  platformLabel,
  fetchFeed,
}: {
  platformLabel: string;
  fetchFeed: () => Promise<FeedPost[]>;
}) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const feedName = platformLabel === 'Bluesky' ? 'Following' : 'Home';

  function load() {
    setLoading(true);
    setError(null);
    fetchFeed()
      .then(setPosts)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--as-gap)' }}>
        <h2 style={{ margin: 0 }}>{platformLabel} — {feedName}</h2>
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
            <div key={post.externalId} className="card">
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
                  <p style={{ margin: '2px 0 0' }}>{post.replyTo.content}</p>
                </div>
              )}
              <p style={{ margin: 0, fontSize: 'var(--as-text-sm)' }}>
                <strong>{post.authorDisplayName}</strong>{' '}
                <span style={{ color: 'var(--as-text-muted)' }}>@{post.authorHandle}</span>
              </p>
              <p style={{ fontSize: 'var(--as-text-sm)', margin: '4px 0' }}>
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

              {post.quoted && <QuotedPostCard quoted={post.quoted} />}

              <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-link" style={{ fontSize: 'var(--as-text-xs)' }}>
                {`View on ${platformLabel} →`}
              </a>
            </div>
          ))}
        </div>
      )}
    </>
  );
}