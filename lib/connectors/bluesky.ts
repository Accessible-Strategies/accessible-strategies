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

    // Build a human-viewable URL from the returned AT URI
    const rkey = result.uri.split('/').pop();
    const handle = process.env.BLUESKY_IDENTIFIER!.replace('@', '');
    const postUrl = `https://bsky.app/profile/${handle}/post/${rkey}`;

    return { success: true, postUrl };
  } catch (err) {
    console.error('Bluesky post failed:', err);
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
      type: n.reason, // 'like' | 'repost' | 'follow' | 'mention' | 'reply' | 'quote'
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
  /** AT Protocol content-hash — required (alongside the uri) for any
   *  write action: liking, reposting, or replying to this post. */
  cid:                string;
  /** The author's stable account ID — required to mute/unmute/block,
   *  which key off identity rather than the (changeable) handle. */
  authorDid:          string;
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string;
  url:                string;
  createdAt:          Date;
  images?:            { url: string; alt: string }[];
  video?:             { url: string; alt: string; thumbnail?: string; isHls: boolean };
  facets?:            any[]; // Bluesky's clickable-span data — see parseBlueskyFacets.ts
  replyCount:         number;
  repostCount:        number;
  likeCount:          number;
  /** Your own like/repost on this post, if any — the AT URI of that
   *  record, which is what deleteLike()/deleteRepost() needs to undo it.
   *  Present only when you've actually liked/reposted, per Bluesky. */
  viewer?:            { likeUri?: string; repostUri?: string };
  /** The root post of this thread — same as {uri, cid} for a top-level
   *  post, but the ORIGINAL post in the chain for anything nested
   *  deeper. Replying requires both the immediate parent AND the root. */
  threadRoot:         { uri: string; cid: string };
  replyTo?:           {
    authorHandle: string;
    authorDisplayName: string;
    content: string;
    images?: { url: string; alt: string }[];
    video?: { url: string; alt: string; thumbnail?: string; isHls: boolean };
  };
  repostedBy?:        { authorHandle: string; authorDisplayName: string };
  /**
   * A quote post — the author added their own text and embedded another
   * post as a rich card, distinct from a `replyTo` (which is a direct
   * reply in a thread). Bluesky embed shapes:
   *   app.bsky.embed.record#view          — quote only
   *   app.bsky.embed.recordWithMedia#view — quote + the quoting post's
   *                                          own attached image/video
   */
  quoted?:            QuotedPost;
  /** A link preview card — present when this post's own embed is an
   *  external URL (not an image/video/quote), e.g. a shared article. */
  link?:              LinkCard;
  /**
   * Direct replies to THIS post that also appear in the same fetched
   * batch — grouped here so the UI can render one connected thread
   * (root above, replies indented below) instead of scattered,
   * unrelated-looking cards. See groupIntoThreads() below.
   */
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

/**
 * Reads images/video/quote/link off a top-level-shaped embed
 * (app.bsky.embed.*#view — the shape used on both feed items and
 * getPostThread's PostView). Shared by the main feed mapping AND by
 * fetched thread parents so both produce identical results.
 */
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

/**
 * Unpacks a `app.bsky.embed.record#view.record` (or the `.record.record`
 * inside a `recordWithMedia#view`) into a QuotedPost. Returns undefined
 * for anything that isn't a live, visible post — a deleted quoted post
 * comes back as `app.bsky.embed.record#viewNotFound`, a moderated one as
 * `#viewBlocked` or `#viewDetached`, neither of which has real content.
 */
function extractQuotedPost(record: any): QuotedPost | undefined {
  if (!record || record.$type !== 'app.bsky.embed.record#viewRecord') return undefined;

  const author = record.author;
  const text = (record.value as any)?.text ?? '';
  const rkey = (record.uri as string)?.split('/').pop();

  // A quoted post's own media lives in `record.embeds` (an array),
  // not `record.embed` — different shape than the top-level post view.
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

/** Normalizes a raw AT Protocol PostView (same shape for a timeline
 *  item's `post`, a reply's `parent`, or a getPostThread() result) into
 *  a NormalizedFeedPost. Used for feed items AND for parents fetched
 *  separately when they weren't already in the batch. */
function normalizePostView(post: any): NormalizedFeedPost {
  const handle = post.author.handle;
  const rkey = (post.uri as string).split('/').pop();
  const media = extractEmbedMedia(post.embed as any);

  // A post's own record carries `reply.root` when it's nested deeper
  // than a direct reply — that's the thread's true origin, needed (along
  // with this post itself as `parent`) to reply correctly via the API.
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

/**
 * "Following" feed — Bluesky calls this getTimeline() by default (posts
 * from accounts you follow, reverse-chronological). record.text is
 * always plain text per the AT Protocol spec, no HTML stripping needed.
 *
 * Media: images are displayed with author-provided alt text passed
 * through as-is. Video is deliberately NOT embedded here — flagged via
 * hasVideo so the UI can link out to view/play it on Bluesky itself,
 * avoiding autoplay and prefers-reduced-motion complexity entirely.
 *
 * Quote posts (app.bsky.embed.record#view / recordWithMedia#view) are
 * unpacked into `quoted`, including the quoted post's own image/video.
 */
/**
 * Bluesky's raw getTimeline() API doesn't fully suppress muted accounts
 * in every case (notably: replies within threads can still surface).
 * The official app does its own client-side filtering on top of the API
 * — this replicates that by fetching the mute list and excluding any
 * post whose author (or reply-parent's author) is muted.
 */
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

/**
 * Groups replies under their parent so the UI can render one connected
 * thread (root above, replies indented below) instead of scattered,
 * unrelated-looking cards. Works on whatever entries are passed in —
 * both feed items AND any orphaned parents fetched separately via
 * getPostThread() (see fetchBlueskyFollowing) — since by the time this
 * runs, every reply's parent has either come from the batch itself or
 * been fetched and appended as its own entry.
 */
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

  // A reply that's now visually nested directly under its parent doesn't
  // need its own duplicate "Replying to..." snippet above its content.
  for (const uri of consumed) {
    delete byUri.get(uri)!.post.replyTo;
  }

  for (const entry of entries) {
    entry.post.replies?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return entries.filter(e => !consumed.has(e.uri)).map(e => e.post);
}

/**
 * Recursively unpacks a getPostThread() node's `replies` array (each of
 * which is itself a threadViewPost with its own nested `replies`) into
 * NormalizedFeedPost.replies chains — used for the on-demand "View full
 * thread" expansion, as opposed to groupIntoThreads() which only ever
 * sees one flat batch of same-page posts.
 */
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

/**
 * Fetches the full reply tree for a single post — used when the user
 * clicks "View full thread" on a post whose replyCount is higher than
 * what's already grouped in from the same feed batch. depth: 10 covers
 * any realistically deep thread; Bluesky's own UI caps around there too.
 */
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
  /** Pass back into the next call to fetch the next page. Undefined
   *  once Bluesky has no more posts to give. */
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

      // If this post is a reply, the AT Protocol feed view already
      // includes the FULL parent post (not just a reference) when the
      // parent hasn't been deleted/blocked — keep a text+media snippet
      // as a fallback in case the parent doesn't end up as its own
      // top-level entry below (see the orphan-fetch step further down).
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

      // A repost surfaces the reposter's identity via `reason`, while
      // item.post is always the ORIGINAL post's content — without
      // checking this, reposts render indistinguishably from originals.
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

  // The same underlying post can appear twice in one batch — most
  // commonly when two different accounts you follow both reposted it,
  // producing two feed items that share the same post.uri. Left alone,
  // that becomes two React elements keyed by the same externalId
  // downstream. Keep just the first occurrence; if a later duplicate was
  // itself a repost, fold its reposter in so "Reposted by" still credits
  // both instead of silently dropping one.
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

  // Most replies in a following feed are to accounts you DON'T follow,
  // so their parent almost never lands in this same 30-post batch —
  // grouping alone would rarely fire. Fetch those orphaned parents
  // directly so every reply threads properly, not just the rare case
  // where both posts happen to co-occur in one page load.
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
          if (thread?.$type !== 'app.bsky.feed.defs#threadViewPost') return null; // notFound / blocked
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