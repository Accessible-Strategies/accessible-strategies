'use client';

import { useEffect, useState } from 'react';
import SchedulerView from '@/components/admin/SchedulerView';
import PlatformFeedView from '@/components/admin/PlatformFeedView';
import BlueskySearch from '@/components/admin/BlueskySearch';
import {
  getBlueskyFollowing,
  getBlueskySavedFeeds,
  getBlueskyCustomFeed,
  getMastodonFollowing,
  likeBluesky,
  unlikeBluesky,
  repostBluesky,
  unrepostBluesky,
  replyToBluesky,
  muteBluesky,
  getBlueskyThread,
  savePost,
  unsavePost,
  listSavedPostIds,
} from '@/lib/actions/feeds';

type Section = 'scheduler' | 'bluesky' | 'mastodon';

interface SavedFeed {
  uri: string;
  displayName: string;
}

const blueskyActions = {
  like: likeBluesky,
  unlike: unlikeBluesky,
  repost: repostBluesky,
  unrepost: unrepostBluesky,
  reply: replyToBluesky,
  mute: muteBluesky,
  fetchThread: getBlueskyThread,
};

// Save/bookmark isn't a platform write action — it's just a local DB row —
// so it works identically for Bluesky and Mastodon, just parameterized by
// platform. Curried here so PlatformFeedView doesn't need to know which
// platform it's rendering when it calls these.
const blueskySaveActions = {
  save: (post: { externalId: string; authorHandle?: string; authorDisplayName?: string; content?: string; url?: string }) =>
    savePost({ platform: 'bluesky', ...post }),
  unsave: (externalId: string) => unsavePost('bluesky', externalId),
  listSavedIds: () => listSavedPostIds('bluesky'),
};

const mastodonSaveActions = {
  save: (post: { externalId: string; authorHandle?: string; authorDisplayName?: string; content?: string; url?: string }) =>
    savePost({ platform: 'mastodon', ...post }),
  unsave: (externalId: string) => unsavePost('mastodon', externalId),
  listSavedIds: () => listSavedPostIds('mastodon'),
};

// Narrower, centered column for the actual post feed — keeps long lines
// of post text readable and matches how Bluesky/Mastodon's own feeds are
// laid out, while the search bar and tab rows above stay full width.
const feedColumnStyle = { width: '75%', margin: '0 auto' } as const;

export default function Socials() {
  const [section, setSection] = useState<Section>('scheduler');
  const [feeds, setFeeds] = useState<SavedFeed[]>([{ uri: 'following', displayName: 'Following' }]);
  const [activeFeedUri, setActiveFeedUri] = useState('following');

  // Pulled live from Bluesky's own account preferences — whatever you've
  // pinned there (via the app's "More feeds" screen) shows up here as a
  // tab automatically, in the same order. Nothing about feed choice is
  // stored in our own database.
  useEffect(() => {
    getBlueskySavedFeeds().then(result => {
      if (result.length > 0) {
        setFeeds(result);
        setActiveFeedUri(prev => (result.some(f => f.uri === prev) ? prev : result[0].uri));
      }
    });
  }, []);

  const activeFeed = feeds.find(f => f.uri === activeFeedUri);
  const fetchActiveBlueskyFeed = activeFeedUri === 'following'
    ? getBlueskyFollowing
    : (cursor?: string) => getBlueskyCustomFeed(activeFeedUri, cursor);

  return (
    <section className="container admin-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--as-gap)', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0 }}>Socials</h1>
        <div className="reason-list reason-list--compact" role="radiogroup" aria-label="Socials section">
          {(['scheduler', 'bluesky', 'mastodon'] as Section[]).map(s => (
            <label key={s} className={`reason-option reason-option--compact${section === s ? ' reason-option--active' : ''}`}>
              <input type="radio" name="socials-section" checked={section === s} onChange={() => setSection(s)} className="sr-only" />
              <span className="reason-option__label">
                {s === 'scheduler' ? 'Scheduler' : s === 'bluesky' ? 'Bluesky' : 'Mastodon'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {section === 'scheduler' && <SchedulerView />}

      {section === 'bluesky' && (
        <>
          <BlueskySearch actions={blueskyActions} saveActions={blueskySaveActions} />

          {feeds.length > 1 && (
            <div
              className="reason-list reason-list--compact"
              role="radiogroup"
              aria-label="Bluesky feed"
              style={{ marginBottom: 'var(--as-gap)' }}
            >
              {feeds.map(feed => (
                <label
                  key={feed.uri}
                  className={`reason-option reason-option--compact${activeFeedUri === feed.uri ? ' reason-option--active' : ''}`}
                >
                  <input
                    type="radio"
                    name="bluesky-feed"
                    checked={activeFeedUri === feed.uri}
                    onChange={() => setActiveFeedUri(feed.uri)}
                    className="sr-only"
                  />
                  <span className="reason-option__label">{feed.displayName}</span>
                </label>
              ))}
            </div>
          )}

          <div style={feedColumnStyle}>
            <PlatformFeedView
              key={activeFeedUri}
              platformLabel="Bluesky"
              feedName={activeFeed?.displayName}
              fetchFeed={fetchActiveBlueskyFeed}
              actions={blueskyActions}
              saveActions={blueskySaveActions}
            />
          </div>
        </>
      )}

      {section === 'mastodon' && (
        <div style={feedColumnStyle}>
          <PlatformFeedView
            platformLabel="Mastodon"
            fetchFeed={getMastodonFollowing}
            saveActions={mastodonSaveActions}
          />
        </div>
      )}
    </section>
  );
}