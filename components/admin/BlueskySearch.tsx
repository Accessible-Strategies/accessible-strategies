'use client';

import { useState, type FormEvent } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import { PostCard, type FeedPost, type FeedActions, type FeedSaveActions } from '@/components/admin/PlatformFeedView';
import ProfileDialog from '@/components/admin/ProfileDialog';
import { searchActorsAction, searchPostsAction, followAction, unfollowAction } from '@/lib/actions/discovery';

interface ActorResult {
  did:            string;
  handle:         string;
  displayName:    string;
  description:    string;
  avatarUrl?:     string;
  followingUri?:  string;
}

type Tab = 'all' | 'profiles' | 'posts';

/** One person's row in the results list — avatar/name open their
 *  profile (same ProfileDialog used elsewhere), Follow toggles right
 *  there without needing to open the dialog first. */
function ActorRow({
  actor,
  onChange,
  onAuthorClick,
}: {
  actor: ActorResult;
  onChange: (patch: Partial<ActorResult>) => void;
  onAuthorClick: (handle: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggleFollow() {
    if (busy) return;
    setBusy(true);
    if (actor.followingUri) {
      const result = await unfollowAction(actor.followingUri);
      if (result.success) onChange({ followingUri: undefined });
    } else {
      const result = await followAction(actor.did);
      if (result.success) onChange({ followingUri: (result as any).followUri });
    }
    setBusy(false);
  }

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button
        type="button"
        onClick={() => onAuthorClick(actor.handle)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
        aria-label={`View ${actor.displayName}'s profile`}
      >
        {actor.avatarUrl ? (
          <img src={actor.avatarUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--as-border)' }} />
        )}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          type="button"
          onClick={() => onAuthorClick(actor.handle)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', textAlign: 'left' }}
        >
          <p style={{ margin: 0, fontSize: 'var(--as-text-sm)' }}>
            <strong>{actor.displayName}</strong>{' '}
            <span style={{ color: 'var(--as-text-muted)' }}>@{actor.handle}</span>
          </p>
        </button>
        {actor.description && (
          <p style={{
            margin: '2px 0 0',
            fontSize: 'var(--as-text-xs)',
            color: 'var(--as-text-muted)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {actor.description}
          </p>
        )}
      </div>

      <button
        type="button"
        className={actor.followingUri ? 'btn btn--ghost' : 'btn btn--primary'}
        onClick={toggleFollow}
        disabled={busy}
        style={{ flexShrink: 0 }}
      >
        {busy ? 'Working…' : actor.followingUri ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}

export default function BlueskySearch({
  actions,
  saveActions,
}: {
  /** Passed straight through to result PostCards so like/repost/reply
   *  work the same on a search result as they do in the feed. */
  actions?: FeedActions;
  saveActions?: FeedSaveActions;
}) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [actors, setActors] = useState<ActorResult[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileHandle, setProfileHandle] = useState<string | null>(null);

  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    const term = query.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const [actorResult, postResult] = await Promise.all([
        searchActorsAction(term),
        searchPostsAction(term),
      ]);
      setActors(actorResult.actors);
      setPosts(postResult.posts);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // Resets everything back to the pre-search state — this is what gets
  // you back to just the search bar (and your normal feed underneath)
  // without scrolling past results or switching sections and back.
  function clearSearch() {
    setQuery('');
    setSearched(false);
    setActors([]);
    setPosts([]);
    setError(null);
    setTab('all');
  }

  function patchActor(did: string, patch: Partial<ActorResult>) {
    setActors(prev => prev.map(a => (a.did === did ? { ...a, ...patch } : a)));
  }

  function patchPost(externalId: string, patch: Partial<FeedPost>) {
    setPosts(prev => prev.map(p => (p.externalId === externalId ? { ...p, ...patch } : p)));
  }

  function hidePost(externalId: string) {
    setPosts(prev => prev.filter(p => p.externalId !== externalId));
  }

  const showActors = tab === 'all' || tab === 'profiles';
  const showPosts = tab === 'all' || tab === 'posts';
  // On "All", only tease a handful of profile matches — Bluesky's own
  // search does the same — so posts (usually the more numerous, more
  // relevant-feeling results) aren't pushed below the fold.
  const actorsToShow = tab === 'all' ? actors.slice(0, 5) : actors;

  return (
    <div style={{ marginBottom: 'var(--as-gap)' }}>
      <form onSubmit={runSearch} style={{ marginBottom: '8px' }}>
        <label
          htmlFor="bluesky-search-input"
          style={{ display: 'block', fontSize: 'var(--as-text-sm)', fontWeight: 600, marginBottom: '4px' }}
        >
          Search Bluesky
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--as-text-muted)' }}
            />
            <input
              id="bluesky-search-input"
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. a11y"
              className="form-input"
              style={{ paddingLeft: '32px', paddingRight: searched ? '36px' : undefined, width: '100%' }}
            />
            {searched && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search and return to feed"
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: 'var(--as-text-muted)',
                  display: 'flex',
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          <button type="submit" className="btn btn--primary" disabled={loading || !query.trim()}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>

      {searched && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--as-gap)', flexWrap: 'wrap', gap: '8px' }}>
            <div
              className="reason-list reason-list--compact"
              role="radiogroup"
              aria-label="Search results filter"
            >
              {(['all', 'profiles', 'posts'] as Tab[]).map(t => (
                <label key={t} className={`reason-option reason-option--compact${tab === t ? ' reason-option--active' : ''}`}>
                  <input type="radio" name="search-tab" checked={tab === t} onChange={() => setTab(t)} className="sr-only" />
                  <span className="reason-option__label">{t === 'all' ? 'All' : t === 'profiles' ? 'Profiles' : 'Posts'}</span>
                </label>
              ))}
            </div>

            <button type="button" className="btn btn--ghost" onClick={clearSearch}>
              ← Back to feed
            </button>
          </div>

          {error && <p style={{ color: 'var(--as-error)', fontSize: 'var(--as-text-sm)' }}>{error}</p>}

          {loading ? (
            <p style={{ color: 'var(--as-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={16} className="spin" aria-hidden="true" /> Searching…
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {showActors && actorsToShow.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {actorsToShow.map(actor => (
                    <ActorRow
                      key={actor.did}
                      actor={actor}
                      onChange={patch => patchActor(actor.did, patch)}
                      onAuthorClick={handle => setProfileHandle(handle)}
                    />
                  ))}
                </div>
              )}

              {showPosts && posts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {posts.map(post => (
                    <PostCard
                      key={post.externalId}
                      post={post}
                      platformLabel="Bluesky"
                      actions={actions}
                      saveActions={saveActions}
                      onChange={patch => patchPost(post.externalId, patch)}
                      onHide={() => hidePost(post.externalId)}
                      onAuthorClick={handle => setProfileHandle(handle)}
                    />
                  ))}
                </div>
              )}

              {actorsToShow.length === 0 && posts.length === 0 && (
                <p style={{ color: 'var(--as-text-muted)' }}>No results for "{query}".</p>
              )}
            </div>
          )}
        </>
      )}

      {profileHandle && (
        <ProfileDialog handle={profileHandle} onClose={() => setProfileHandle(null)} />
      )}
    </div>
  );
}