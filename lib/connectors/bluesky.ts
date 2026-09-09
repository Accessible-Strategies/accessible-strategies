import { BskyAgent } from '@atproto/api';

/**
 * Bluesky uses "App Passwords" — a simple identifier + app-specific
 * password, no OAuth flow needed for a server-side scheduler like this.
 * Generate one at bsky.app → Settings → App Passwords.
 */
export async function postToBluesky(content: string): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  try {
    const agent = new BskyAgent({ service: 'https://bsky.social' });

    await agent.login({
      identifier: process.env.BLUESKY_IDENTIFIER!,
      password: process.env.BLUESKY_APP_PASSWORD!,
    });

    const result = await agent.post({
      text: content,
      createdAt: new Date().toISOString(),
    });

    const rkey = result.uri.split('/').pop();
    const handle = process.env.BLUESKY_IDENTIFIER!.replace('@', '');
    const postUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;

    return { success: true, postUrl };
  } catch (err) {
    console.error('Bluesky post failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Posts a thread — an ordered list of texts, each posted as a reply to
 * the previous one, so they render as one connected conversation rather
 * than separate unrelated posts. parts[0] becomes the root; every
 * following part replies to the one right before it, while still
 * pointing back at the same root (required by the AT Protocol — a reply
 * needs both its immediate parent AND the thread's origin post).
 * Returns the ROOT post's URL, since that's the entry point into the
 * whole thread.
 */
export async function postThreadToBluesky(
  parts: string[]
): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  if (parts.length === 0) {
    return { success: false, error: 'No content to post' };
  }

  try {
    const agent = await getAuthedAgent();
    const handle = process.env.BLUESKY_IDENTIFIER!.replace('@', '');

    let rootRef: { uri: string; cid: string } | undefined;
    let parentRef: { uri: string; cid: string } | undefined;
    let rootPostUrl = '';

    for (let i = 0; i < parts.length; i++) {
      const record: any = {
        text: parts[i],
        createdAt: new Date().toISOString(),
      };

      if (rootRef && parentRef) {
        record.reply = { root: rootRef, parent: parentRef };
      }

      const result = await agent.post(record);
      const ref = { uri: result.uri, cid: result.cid };

      if (i === 0) {
        rootRef = ref;
        const rkey = result.uri.split('/').pop();
        rootPostUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;
      }
      parentRef = ref;
    }

    return { success: true, postUrl: rootPostUrl };
  } catch (err) {
    console.error('Bluesky thread post failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function getAuthedAgent(): Promise<BskyAgent> {
  const agent = new BskyAgent({ service: 'https://bsky.social' });
  await agent.login({
    identifier: process.env.BLUESKY_IDENTIFIER!,
    password: process.env.BLUESKY_APP_PASSWORD!,
  });
  return agent;
}

type ActionResult = { success: boolean; error?: string };
type LikeResult = ActionResult & { likeUri?: string };
type RepostResult = ActionResult & { repostUri?: string };
type ReplyResult = ActionResult & { postUrl?: string };

export async function likeBlueskyPost(uri: string, cid: string): Promise<LikeResult> {
  try {
    const agent = await getAuthedAgent();
    const result = await agent.like(uri, cid);
    return { success: true, likeUri: result.uri };
  } catch (err) {
    console.error('Bluesky like failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function unlikeBlueskyPost(likeUri: string): Promise<ActionResult> {
  try {
    const agent = await getAuthedAgent();
    await agent.deleteLike(likeUri);
    return { success: true };
  } catch (err) {
    console.error('Bluesky unlike failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function repostBlueskyPost(uri: string, cid: string): Promise<RepostResult> {
  try {
    const agent = await getAuthedAgent();
    const result = await agent.repost(uri, cid);
    return { success: true, repostUri: result.uri };
  } catch (err) {
    console.error('Bluesky repost failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function unrepostBlueskyPost(repostUri: string): Promise<ActionResult> {
  try {
    const agent = await getAuthedAgent();
    await agent.deleteRepost(repostUri);
    return { success: true };
  } catch (err) {
    console.error('Bluesky un-repost failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Replies to a post. `root` is the thread's origin post (same as
 * `parent` when replying to a top-level post); `parent` is the specific
 * post being replied to. Both come straight from a NormalizedFeedPost's
 * `threadRoot` and `{externalId, cid}` — see PlatformFeedView's reply
 * composer.
 */
export async function replyToBlueskyPost(
  text: string,
  root: { uri: string; cid: string },
  parent: { uri: string; cid: string }
): Promise<ReplyResult> {
  try {
    const agent = await getAuthedAgent();
    const result = await agent.post({
      text,
      reply: { root, parent },
      createdAt: new Date().toISOString(),
    });

    const rkey = result.uri.split('/').pop();
    const handle = process.env.BLUESKY_IDENTIFIER!.replace('@', '');
    const postUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;

    return { success: true, postUrl };
  } catch (err) {
    console.error('Bluesky reply failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function muteBlueskyAccount(did: string): Promise<ActionResult> {
  try {
    const agent = await getAuthedAgent();
    await agent.mute(did);
    return { success: true };
  } catch (err) {
    console.error('Bluesky mute failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function unmuteBlueskyAccount(did: string): Promise<ActionResult> {
  try {
    const agent = await getAuthedAgent();
    await agent.unmute(did);
    return { success: true };
  } catch (err) {
    console.error('Bluesky unmute failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export interface NormalizedNotification {
  externalId:        string;
  type:               string;
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string; // always plain text
  url:                string;
  createdAt:          Date;
}
export async function fetchBlueskyNotifications(): Promise<NormalizedNotification[]> {
  const agent = new BskyAgent({ service: 'https://bsky.social' });

  await agent.login({
    identifier: process.env.BLUESKY_IDENTIFIER!,
    password: process.env.BLUESKY_APP_PASSWORD!,
  });

  const res = await agent.listNotifications({ limit: 50 });

  return res.data.notifications.map(n => {
    const text = (n.record as any)?.text ?? '';
    const handle = n.author.handle;
    return {
      externalId: n.uri,
      type: n.reason,
      authorHandle: handle,
      authorDisplayName: n.author.displayName ?? handle,
      content: text,
      url: `https://bsky.app/profile/${handle}`,
      createdAt: new Date(n.indexedAt),
    };
  });
}

export interface QuotedPost {
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string;
  url:                string;
  images?:            { url: string; alt: string }[];
  video?:             { url: string; alt: string; thumbnail?: string; isHls: boolean };
  link?:              LinkCard;
}

/** An external-site link preview card — Bluesky renders these when a
 *  post's URL has Open Graph metadata (title/description/thumbnail). */
export interface LinkCard {
  uri:                string;
  title:              string;
  description:        string;
  thumbUrl?:          string;
}

export interface NormalizedFeedPost {
  externalId:        string;
  cid:                string;
  authorDid:          string;
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string;
  url:                string;
  createdAt:          Date;
  images?:            { url: string; alt: string }[];
  video?:             { url: string; alt: string; thumbnail?: string; isHls: boolean };
  facets?:            any[];
  replyCount:         number;
  repostCount:        number;
  likeCount:          number;
  viewer?:            { likeUri?: string; repostUri?: string };
  threadRoot:         { uri: string; cid: string };
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
  replies?:           NormalizedFeedPost[];
}

type MediaBits = {
  images?: { url: string; alt: string }[];
  video?: { url: string; alt: string; thumbnail?: string; isHls: boolean };
  quoted?: QuotedPost;
  link?: LinkCard;
};

function extractLinkCard(embed: any): LinkCard | undefined {
  if (embed?.$type !== 'app.bsky.embed.external#view' || !embed.external) return undefined;
  const ext = embed.external;
  return {
    uri: ext.uri,
    title: ext.title ?? ext.uri,
    description: ext.description ?? '',
    thumbUrl: ext.thumb,
  };
}

function extractEmbedMedia(embed: any): MediaBits {
  if (embed?.$type === 'app.bsky.embed.images#view') {
    return { images: embed.images.map((img: any) => ({ url: img.fullsize, alt: img.alt ?? '' })) };
  }
  if (embed?.$type === 'app.bsky.embed.video#view') {
    return { video: { url: embed.playlist, alt: embed.alt ?? '', thumbnail: embed.thumbnail, isHls: true } };
  }
  if (embed?.$type === 'app.bsky.embed.external#view') {
    return { link: extractLinkCard(embed) };
  }
  if (embed?.$type === 'app.bsky.embed.record#view') {
    return { quoted: extractQuotedPost(embed.record) };
  }
  if (embed?.$type === 'app.bsky.embed.recordWithMedia#view') {
    const quoted = extractQuotedPost(embed.record?.record);
    const media = embed.media;
    if (media?.$type === 'app.bsky.embed.images#view') {
      return { quoted, images: media.images.map((img: any) => ({ url: img.fullsize, alt: img.alt ?? '' })) };
    }
    if (media?.$type === 'app.bsky.embed.video#view') {
      return { quoted, video: { url: media.playlist, alt: media.alt ?? '', thumbnail: media.thumbnail, isHls: true } };
    }
    if (media?.$type === 'app.bsky.embed.external#view') {
      return { quoted, link: extractLinkCard(media) };
    }
    return { quoted };
  }
  return {};
}

function extractQuotedPost(record: any): QuotedPost | undefined {
  if (!record || record.$type !== 'app.bsky.embed.record#viewRecord') return undefined;

  const author = record.author;
  const text = (record.value as any)?.text ?? '';
  const rkey = (record.uri as string)?.split('/').pop();

  const nestedEmbed = (record.embeds ?? [])[0];
  let images: { url: string; alt: string }[] | undefined;
  let video: { url: string; alt: string; thumbnail?: string; isHls: boolean } | undefined;
  let link: LinkCard | undefined;

  if (nestedEmbed?.$type === 'app.bsky.embed.images#view') {
    images = nestedEmbed.images.map((img: any) => ({ url: img.fullsize, alt: img.alt ?? '' }));
  } else if (nestedEmbed?.$type === 'app.bsky.embed.video#view') {
    video = { url: nestedEmbed.playlist, alt: nestedEmbed.alt ?? '', thumbnail: nestedEmbed.thumbnail, isHls: true };
  } else if (nestedEmbed?.$type === 'app.bsky.embed.external#view') {
    link = extractLinkCard(nestedEmbed);
  }

  return {
    authorHandle: author.handle,
    authorDisplayName: author.displayName ?? author.handle,
    content: text,
    url: `https://bsky.app/profile/${author.handle}/post/${rkey}`,
    images,
    video,
    link,
  };
}

function normalizePostView(post: any): NormalizedFeedPost {
  const handle = post.author.handle;
  const rkey = (post.uri as string).split('/').pop();
  const media = extractEmbedMedia(post.embed as any);

  const recordReplyRoot = (post.record as any)?.reply?.root;
  const threadRoot = recordReplyRoot
    ? { uri: recordReplyRoot.uri, cid: recordReplyRoot.cid }
    : { uri: post.uri, cid: post.cid };

  return {
    externalId: post.uri,
    cid: post.cid,
    authorDid: post.author.did,
    authorHandle: handle,
    authorDisplayName: post.author.displayName ?? handle,
    content: (post.record as any)?.text ?? '',
    url: `https://bsky.app/profile/${handle}/post/${rkey}`,
    createdAt: new Date(post.indexedAt),
    facets: (post.record as any)?.facets,
    replyCount: post.replyCount ?? 0,
    repostCount: post.repostCount ?? 0,
    likeCount: post.likeCount ?? 0,
    viewer: {
      likeUri: post.viewer?.like,
      repostUri: post.viewer?.repost,
    },
    threadRoot,
    ...media,
  };
}

async function getMutedDids(agent: BskyAgent): Promise<Set<string>> {
  const muted = new Set<string>();
  let cursor: string | undefined;
  do {
    const res = await agent.app.bsky.graph.getMutes({ limit: 100, cursor });
    res.data.mutes.forEach(m => muted.add(m.did));
    cursor = res.data.cursor;
  } while (cursor);
  return muted;
}

type ThreadEntry = { uri: string; parentUri: string | undefined; post: NormalizedFeedPost };

function groupIntoThreads(entries: ThreadEntry[]): NormalizedFeedPost[] {
  const byUri = new Map(entries.map(e => [e.uri, e]));
  const consumed = new Set<string>();

  for (const entry of entries) {
    if (entry.parentUri && byUri.has(entry.parentUri)) {
      const parent = byUri.get(entry.parentUri)!;
      parent.post.replies = parent.post.replies ?? [];
      parent.post.replies.push(entry.post);
      consumed.add(entry.uri);
    }
  }

  for (const uri of consumed) {
    delete byUri.get(uri)!.post.replyTo;
  }

  for (const entry of entries) {
    entry.post.replies?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return entries.filter(e => !consumed.has(e.uri)).map(e => e.post);
}

function flattenThreadReplies(threadNode: any): NormalizedFeedPost[] {
  const replies = (threadNode.replies ?? []) as any[];
  return replies
    .filter(r => r?.$type === 'app.bsky.feed.defs#threadViewPost')
    .map(r => {
      const post = normalizePostView(r.post);
      post.replies = flattenThreadReplies(r);
      return post;
    })
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function fetchBlueskyThread(uri: string): Promise<NormalizedFeedPost[]> {
  try {
    const agent = await getAuthedAgent();
    const res = await agent.getPostThread({ uri, depth: 10 });
    const thread = res.data.thread as any;
    if (thread?.$type !== 'app.bsky.feed.defs#threadViewPost') return [];
    return flattenThreadReplies(thread);
  } catch (err) {
    console.error('Bluesky thread fetch failed:', err);
    return [];
  }
}

export interface FeedPage {
  posts: NormalizedFeedPost[];
  nextCursor?: string;
}

export async function fetchBlueskyFollowing(cursor?: string): Promise<FeedPage> {
  const agent = new BskyAgent({ service: 'https://bsky.social' });

  await agent.login({
    identifier: process.env.BLUESKY_IDENTIFIER!,
    password: process.env.BLUESKY_APP_PASSWORD!,
  });

  const [res, mutedDids] = await Promise.all([
    agent.getTimeline({ limit: 30, cursor }),
    getMutedDids(agent),
  ]);

  const entries: ThreadEntry[] = res.data.feed
    .filter(item => {
      if (mutedDids.has(item.post.author.did)) return false;
      const replyParentAuthorDid = (item as any).reply?.parent?.author?.did;
      if (replyParentAuthorDid && mutedDids.has(replyParentAuthorDid)) return false;
      return true;
    })
    .map(item => {
      const post = item.post;

      const replyParent = (item as any).reply?.parent;
      let replyTo: NormalizedFeedPost['replyTo'];
      if (replyParent && !replyParent.notFound && !replyParent.blocked) {
        const parentMedia = extractEmbedMedia(replyParent.embed as any);
        replyTo = {
          authorHandle: replyParent.author.handle,
          authorDisplayName: replyParent.author.displayName ?? replyParent.author.handle,
          content: (replyParent.record as any)?.text ?? '',
          images: parentMedia.images,
          video: parentMedia.video,
        };
      }

      const reason = (item as any).reason;
      const repostedBy = reason?.$type === 'app.bsky.feed.defs#reasonRepost'
        ? { authorHandle: reason.by.handle, authorDisplayName: reason.by.displayName ?? reason.by.handle }
        : undefined;

      const normalized = normalizePostView(post);
      normalized.replyTo = replyTo;
      normalized.repostedBy = repostedBy;

      return {
        uri: post.uri,
        parentUri: replyParent?.uri as string | undefined,
        post: normalized,
      };
    });

  const seenUris = new Map<string, ThreadEntry>();
  for (const entry of entries) {
    const existing = seenUris.get(entry.uri);
    if (!existing) {
      seenUris.set(entry.uri, entry);
    } else if (entry.post.repostedBy && existing.post.repostedBy) {
      existing.post.repostedBy = {
        authorHandle: existing.post.repostedBy.authorHandle,
        authorDisplayName: `${existing.post.repostedBy.authorDisplayName} and ${entry.post.repostedBy.authorDisplayName}`,
      };
    } else if (entry.post.repostedBy && !existing.post.repostedBy) {
      existing.post.repostedBy = entry.post.repostedBy;
    }
  }
  const dedupedEntries = Array.from(seenUris.values());
  entries.length = 0;
  entries.push(...dedupedEntries);

  const inBatch = new Set(entries.map(e => e.uri));
  const orphanParentUris = Array.from(new Set(
    entries
      .map(e => e.parentUri)
      .filter((uri): uri is string => !!uri && !inBatch.has(uri))
  ));

  if (orphanParentUris.length > 0) {
    const fetched = await Promise.all(
      orphanParentUris.map(async uri => {
        try {
          const threadRes = await agent.getPostThread({ uri, depth: 0, parentHeight: 0 });
          const thread = threadRes.data.thread as any;
          if (thread?.$type !== 'app.bsky.feed.defs#threadViewPost') return null;
          return { uri, post: normalizePostView(thread.post) };
        } catch (err) {
          console.error('Failed to fetch parent thread for', uri, err);
          return null;
        }
      })
    );

    for (const result of fetched) {
      if (!result) continue;
      entries.push({ uri: result.uri, parentUri: undefined, post: result.post });
    }
  }

  return { posts: groupIntoThreads(entries), nextCursor: res.data.cursor };
}

// ─── Discovery: profiles, author feeds, follow/unfollow ───────────────────

export interface BlueskyProfile {
  did:                string;
  handle:             string;
  displayName:        string;
  description:        string;
  avatarUrl?:         string;
  bannerUrl?:         string;
  followersCount:     number;
  followsCount:       number;
  postsCount:         number;
  /** The AT URI of YOUR follow record on this account, if you follow
   *  them — pass straight into unfollowBlueskyAccount() to undo it.
   *  Undefined means you don't currently follow them. */
  followingUri?:      string;
}

export async function getBlueskyProfile(handle: string): Promise<BlueskyProfile | null> {
  try {
    const agent = await getAuthedAgent();
    const res = await agent.getProfile({ actor: handle });
    const p = res.data;
    return {
      did: p.did,
      handle: p.handle,
      displayName: p.displayName ?? p.handle,
      description: p.description ?? '',
      avatarUrl: p.avatar,
      bannerUrl: p.banner,
      followersCount: p.followersCount ?? 0,
      followsCount: p.followsCount ?? 0,
      postsCount: p.postsCount ?? 0,
      followingUri: p.viewer?.following,
    };
  } catch (err) {
    console.error('Bluesky profile fetch failed:', err);
    return null;
  }
}

/**
 * A single author's own posts (their profile timeline) — same shape as
 * fetchBlueskyFollowing's result, but scoped to one account via
 * getAuthorFeed rather than the timeline. Deliberately skips the
 * mute-filtering and orphan-parent-fetch steps that following feed
 * does: you're looking at one specific account on purpose, and Bluesky
 * already includes the immediate reply parent when there is one.
 */
export async function fetchBlueskyAuthorFeed(handle: string, cursor?: string): Promise<FeedPage> {
  const agent = await getAuthedAgent();
  const res = await agent.getAuthorFeed({ actor: handle, limit: 30, cursor });

  const entries: ThreadEntry[] = res.data.feed.map(item => {
    const post = item.post;
    const replyParent = (item as any).reply?.parent;

    let replyTo: NormalizedFeedPost['replyTo'];
    if (replyParent && !replyParent.notFound && !replyParent.blocked) {
      const parentMedia = extractEmbedMedia(replyParent.embed as any);
      replyTo = {
        authorHandle: replyParent.author.handle,
        authorDisplayName: replyParent.author.displayName ?? replyParent.author.handle,
        content: (replyParent.record as any)?.text ?? '',
        images: parentMedia.images,
        video: parentMedia.video,
      };
    }

    const reason = (item as any).reason;
    const repostedBy = reason?.$type === 'app.bsky.feed.defs#reasonRepost'
      ? { authorHandle: reason.by.handle, authorDisplayName: reason.by.displayName ?? reason.by.handle }
      : undefined;

    const normalized = normalizePostView(post);
    normalized.replyTo = replyTo;
    normalized.repostedBy = repostedBy;

    return { uri: post.uri, parentUri: replyParent?.uri as string | undefined, post: normalized };
  });

  return { posts: groupIntoThreads(entries), nextCursor: res.data.cursor };
}

export async function followBlueskyAccount(did: string): Promise<ActionResult & { followUri?: string }> {
  try {
    const agent = await getAuthedAgent();
    const result = await agent.follow(did);
    return { success: true, followUri: result.uri };
  } catch (err) {
    console.error('Bluesky follow failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function unfollowBlueskyAccount(followUri: string): Promise<ActionResult> {
  try {
    const agent = await getAuthedAgent();
    await agent.deleteFollow(followUri);
    return { success: true };
  } catch (err) {
    console.error('Bluesky unfollow failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
export interface SavedFeed {
  /** For the special "Following" entry this is the literal string
   *  'following' rather than a real AT-URI — fetchBlueskyCustomFeed()
   *  checks for that sentinel and pulls the timeline instead of a
   *  feed generator's feed. */
  uri:          string;
  displayName:  string;
}

/**
 * Your pinned feeds — the same tab bar shown in the Bluesky app itself
 * (Following, plus whatever custom feeds you've pinned there). Stored as
 * part of your account preferences, so adding/removing/reordering pins
 * in the Bluesky app is reflected here automatically — nothing about
 * feed choice lives in our own database.
 */
export async function getBlueskySavedFeeds(): Promise<SavedFeed[]> {
  try {
    const agent = await getAuthedAgent();
    const prefs = await agent.app.bsky.actor.getPreferences();

    const pref = prefs.data.preferences.find(
      (p: any) => p.$type === 'app.bsky.actor.defs#savedFeedsPrefV2'
    ) as any;

    if (!pref) return [{ uri: 'following', displayName: 'Following' }];

    const pinned = (pref.items as any[]).filter(item => item.pinned);
    const feedUris = pinned.filter(item => item.type === 'feed').map(item => item.value);

    const generators = feedUris.length > 0
      ? (await agent.app.bsky.feed.getFeedGenerators({ feeds: feedUris })).data.feeds
      : [];
    const nameByUri = new Map(generators.map(g => [g.uri, g.displayName]));

    return pinned.map(item => {
      if (item.type === 'timeline') {
        return { uri: 'following', displayName: 'Following' };
      }
      return { uri: item.value, displayName: nameByUri.get(item.value) ?? item.value };
    });
  } catch (err) {
    console.error('Bluesky saved feeds fetch failed:', err);
    return [{ uri: 'following', displayName: 'Following' }];
  }
}

/**
 * Posts from a specific custom feed (one of your pinned feeds, other
 * than Following) — same normalized shape as fetchBlueskyFollowing, just
 * sourced from a feed generator's own algorithm instead of your
 * timeline. Deliberately skips mute-filtering and orphan-parent-fetch
 * (see fetchBlueskyFollowing) to keep this fast — a curated feed's
 * replies less commonly need that treatment than your own timeline does.
 */
export async function fetchBlueskyCustomFeed(feedUri: string, cursor?: string): Promise<FeedPage> {
  const agent = await getAuthedAgent();
  const res = await agent.app.bsky.feed.getFeed({ feed: feedUri, limit: 30, cursor });

  const entries: ThreadEntry[] = res.data.feed.map(item => {
    const post = item.post;
    const replyParent = (item as any).reply?.parent;

    let replyTo: NormalizedFeedPost['replyTo'];
    if (replyParent && !replyParent.notFound && !replyParent.blocked) {
      const parentMedia = extractEmbedMedia(replyParent.embed as any);
      replyTo = {
        authorHandle: replyParent.author.handle,
        authorDisplayName: replyParent.author.displayName ?? replyParent.author.handle,
        content: (replyParent.record as any)?.text ?? '',
        images: parentMedia.images,
        video: parentMedia.video,
      };
    }

    const reason = (item as any).reason;
    const repostedBy = reason?.$type === 'app.bsky.feed.defs#reasonRepost'
      ? { authorHandle: reason.by.handle, authorDisplayName: reason.by.displayName ?? reason.by.handle }
      : undefined;

    const normalized = normalizePostView(post);
    normalized.replyTo = replyTo;
    normalized.repostedBy = repostedBy;

    return { uri: post.uri, parentUri: replyParent?.uri as string | undefined, post: normalized };
  });

  return { posts: groupIntoThreads(entries), nextCursor: res.data.cursor };
}
export interface ActorSearchResult {
  did:                string;
  handle:             string;
  displayName:        string;
  description:        string;
  avatarUrl?:         string;
  /** Same convention as BlueskyProfile.followingUri — the AT URI of your
   *  follow record if you already follow them, undefined otherwise. */
  followingUri?:      string;
}

export async function searchBlueskyActors(query: string, cursor?: string): Promise<{ actors: ActorSearchResult[]; nextCursor?: string }> {
  const agent = await getAuthedAgent();
  const res = await agent.app.bsky.actor.searchActors({ term: query, limit: 25, cursor });

  const actors = res.data.actors.map(a => ({
    did: a.did,
    handle: a.handle,
    displayName: a.displayName ?? a.handle,
    description: a.description ?? '',
    avatarUrl: a.avatar,
    followingUri: a.viewer?.following,
  }));

  return { actors, nextCursor: res.data.cursor };
}

/**
 * Full-text post search. Same normalized shape as the feed fetchers, so
 * results drop straight into PostCard — though counts (likes/reposts/
 * replies) reflect the post's state at the moment of the search, not
 * live figures the way a freshly-fetched feed item's would.
 */
export async function searchBlueskyPosts(query: string, cursor?: string): Promise<FeedPage> {
  const agent = await getAuthedAgent();
  const res = await agent.app.bsky.feed.searchPosts({ q: query, limit: 25, cursor });

  const posts = res.data.posts.map(post => normalizePostView(post));
  return { posts, nextCursor: res.data.cursor };
}