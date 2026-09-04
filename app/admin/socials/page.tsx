'use client';

import { useState } from 'react';
import SchedulerView from '@/components/admin/SchedulerView';
import PlatformFeedView from '@/components/admin/PlatformFeedView';
import {
  getBlueskyFollowing,
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

export default function Socials() {
  const [section, setSection] = useState<Section>('scheduler');

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
        <PlatformFeedView
          platformLabel="Bluesky"
          fetchFeed={getBlueskyFollowing}
          actions={blueskyActions}
          saveActions={blueskySaveActions}
        />
      )}
      {section === 'mastodon' && (
        <PlatformFeedView
          platformLabel="Mastodon"
          fetchFeed={getMastodonFollowing}
          saveActions={mastodonSaveActions}
        />
      )}
    </section>
  );
}