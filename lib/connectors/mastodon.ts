/**
 * Mastodon posting via a personal access token — generated on your own
 * instance under Settings → Development → New Application, granting the
 * write:statuses scope. No public OAuth redirect flow needed since this
 * is for posting to an account you own.
 */
export async function postToMastodon(content: string): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  try {
    const instanceUrl = process.env.MASTODON_INSTANCE_URL!;
    const accessToken  = process.env.MASTODON_ACCESS_TOKEN!;

    const res = await fetch(`${instanceUrl}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: content }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Mastodon API returned ${res.status}: ${body}`);
    }

    const data = await res.json();

    return { success: true, postUrl: data.url };
  } catch (err) {
    console.error('Mastodon post failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Posts a thread — an ordered list of statuses, each one set as a reply
 * to the previous via `in_reply_to_id`. Simpler than Bluesky's
 * root+parent pair: Mastodon only needs the immediate parent's ID: the
 * server itself walks the chain back to figure out the whole
 * conversation. Returns the ROOT post's URL.
 */
export async function postThreadToMastodon(
  parts: string[]
): Promise<{ success: boolean; postUrl?: string; error?: string }> {
  if (parts.length === 0) {
    return { success: false, error: 'No content to post' };
  }

  try {
    const instanceUrl = process.env.MASTODON_INSTANCE_URL!;
    const accessToken  = process.env.MASTODON_ACCESS_TOKEN!;

    let inReplyToId: string | undefined;
    let rootPostUrl = '';

    for (let i = 0; i < parts.length; i++) {
      const body: Record<string, string> = { status: parts[i] };
      if (inReplyToId) body.in_reply_to_id = inReplyToId;

      const res = await fetch(`${instanceUrl}/api/v1/statuses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Mastodon API returned ${res.status}: ${errBody}`);
      }

      const data = await res.json();
      if (i === 0) rootPostUrl = data.url;
      inReplyToId = data.id;
    }

    return { success: true, postUrl: rootPostUrl };
  } catch (err) {
    console.error('Mastodon thread post failed:', err);
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

/**
 * IMPORTANT: Mastodon's notification.status.content is HTML — and unlike
 * everything else this app renders, it comes from OTHER PEOPLE on the
 * fediverse, not from Marco as sole trusted author. Rendering it with
 * dangerouslySetInnerHTML would be a genuine XSS risk. We strip all HTML
 * tags to plain text here — lossy (loses formatting/links) but safe.
 * Never render this content field as HTML anywhere downstream.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// stripHtml() is still used for Notifications (plain-text summaries).
// For the Following feed below, RAW HTML is now passed through instead —
// it MUST be sanitized with DOMPurify at render time (see
// PlatformFeedView.tsx), never rendered directly with
// dangerouslySetInnerHTML. This content is unsanitized third-party HTML.

export interface NormalizedFeedPost {
  externalId:        string;
  authorHandle:       string;
  authorDisplayName:  string;
  content:            string; // always plain text
  url:                string;
  createdAt:          Date;
}

export async function fetchMastodonFollowing(): Promise<NormalizedFeedPost[]> {
  const instanceUrl = process.env.MASTODON_INSTANCE_URL!;
  const accessToken  = process.env.MASTODON_ACCESS_TOKEN!;

  const res = await fetch(`${instanceUrl}/api/v1/timelines/home?limit=30`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Mastodon home timeline fetch failed: ${res.status}`);
  }

  const data = await res.json();

  return data.map((status: any) => ({
    externalId: status.id,
    authorHandle: status.account.acct,
    authorDisplayName: status.account.display_name || status.account.acct,
          content: status.content, // RAW HTML — sanitize with DOMPurify before rendering
    url: status.url,
    createdAt: new Date(status.created_at),
  }));
}

export async function fetchMastodonNotifications(): Promise<NormalizedNotification[]> {
  const instanceUrl = process.env.MASTODON_INSTANCE_URL!;
  const accessToken  = process.env.MASTODON_ACCESS_TOKEN!;

  const res = await fetch(`${instanceUrl}/api/v1/notifications?limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Mastodon notifications fetch failed: ${res.status}`);
  }

  const data = await res.json();

  return data.map((n: any) => ({
    externalId: n.id,
    type: n.type, // 'mention' | 'reblog' | 'favourite' | 'follow' | 'follow_request' | 'poll' | 'update'
    authorHandle: n.account.acct,
    authorDisplayName: n.account.display_name || n.account.acct,
    content: n.status ? stripHtml(n.status.content) : '',
    url: n.status?.url ?? n.account.url,
    createdAt: new Date(n.created_at),
  }));
}