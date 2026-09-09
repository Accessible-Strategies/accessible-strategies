'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import PlatformFeedView, { PostCard, type FeedPost } from '@/components/admin/PlatformFeedView';
import { getProfileAction, fetchAuthorFeedAction, followAction, unfollowAction } from '@/lib/actions/discovery';

interface BlueskyProfile {
  did:                string;
  handle:             string;
  displayName:        string;
  description:        string;
  avatarUrl?:         string;
  bannerUrl?:         string;
  followersCount:     number;
  followsCount:       number;
  postsCount:         number;
  followingUri?:      string;
}

export default function ProfileDialog({ handle, onClose }: { handle: string; onClose: () => void }) {
  const [profile, setProfile] = useState<BlueskyProfile | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([getProfileAction(handle), fetchAuthorFeedAction(handle)])
      .then(([p, feed]) => {
        if (!p) {
          setError('Could not load this profile.');
          return;
        }
        setProfile(p);
        setPosts(feed.posts);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [handle]);

  function patchPost(externalId: string, patch: Partial<FeedPost>) {
    setPosts(prev => prev.map(p => (p.externalId === externalId ? { ...p, ...patch } : p)));
  }

  function hidePost(externalId: string) {
    setPosts(prev => prev.filter(p => p.externalId !== externalId));
  }

  async function toggleFollow() {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    const wasFollowing = !!profile.followingUri;
    if (wasFollowing) {
      const result = await unfollowAction(profile.followingUri!);
      if (result.success) setProfile({ ...profile, followingUri: undefined, followersCount: profile.followersCount - 1 });
    } else {
      const result = await followAction(profile.did);
      if (result.success) setProfile({ ...profile, followingUri: (result as any).followUri, followersCount: profile.followersCount + 1 });
    }
    setFollowBusy(false);
  }

  return (
    <Modal title={profile ? profile.displayName : `@${handle}`} onClose={onClose} maxWidth="640px" maximizable persistKey="profile-dialog">
      {loading ? (
        <p style={{ color: 'var(--as-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={16} className="spin" aria-hidden="true" /> Loading profile…
        </p>
      ) : error ? (
        <p style={{ color: 'var(--as-error)' }}>{error}</p>
      ) : profile ? (
        <>
          {profile.bannerUrl && (
            <img
              src={profile.bannerUrl}
              alt=""
              style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: 'var(--as-radius-md)', marginBottom: '-32px' }}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt=""
                style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid var(--as-bg)', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '3px solid var(--as-bg)', background: 'var(--as-border)' }} />
            )}
            <button
              type="button"
              className={profile.followingUri ? 'btn btn--ghost' : 'btn btn--primary'}
              onClick={toggleFollow}
              disabled={followBusy}
              style={{ marginBottom: '4px' }}
            >
              {followBusy ? 'Working…' : profile.followingUri ? 'Following' : 'Follow'}
            </button>
          </div>

          <h3 style={{ margin: '10px 0 0' }}>{profile.displayName}</h3>
          <p style={{ margin: '2px 0 0', color: 'var(--as-text-muted)', fontSize: 'var(--as-text-sm)' }}>@{profile.handle}</p>

          {profile.description && (
            <p style={{ margin: '10px 0 0', fontSize: 'var(--as-text-sm)', whiteSpace: 'pre-wrap' }}>{profile.description}</p>
          )}

          <div style={{ display: 'flex', gap: '16px', margin: '10px 0 0', fontSize: 'var(--as-text-sm)' }}>
            <span><strong>{profile.postsCount}</strong> <span style={{ color: 'var(--as-text-muted)' }}>posts</span></span>
            <span><strong>{profile.followersCount}</strong> <span style={{ color: 'var(--as-text-muted)' }}>followers</span></span>
            <span><strong>{profile.followsCount}</strong> <span style={{ color: 'var(--as-text-muted)' }}>following</span></span>
          </div>

          <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--as-border)' }} />

          {posts.length === 0 ? (
            <p style={{ color: 'var(--as-text-muted)' }}>No posts to show.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {posts.map(post => (
                <PostCard
                  key={post.externalId}
                  post={post}
                  platformLabel="Bluesky"
                  onChange={patch => patchPost(post.externalId, patch)}
                  onHide={() => hidePost(post.externalId)}
                />
              ))}
            </div>
          )}
        </>
      ) : null}
    </Modal>
  );
}