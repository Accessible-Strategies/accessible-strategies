'use server';

export async function getProfileAction(handle: string) {
  const { getBlueskyProfile } = await import('@/lib/connectors/bluesky');
  return getBlueskyProfile(handle);
}

export async function fetchAuthorFeedAction(handle: string, cursor?: string) {
  const { fetchBlueskyAuthorFeed } = await import('@/lib/connectors/bluesky');
  return fetchBlueskyAuthorFeed(handle, cursor);
}

export async function followAction(did: string) {
  const { followBlueskyAccount } = await import('@/lib/connectors/bluesky');
  return followBlueskyAccount(did);
}

export async function unfollowAction(followUri: string) {
  const { unfollowBlueskyAccount } = await import('@/lib/connectors/bluesky');
  return unfollowBlueskyAccount(followUri);
}
export async function searchActorsAction(query: string, cursor?: string) {
  const { searchBlueskyActors } = await import('@/lib/connectors/bluesky');
  return searchBlueskyActors(query, cursor);
}

export async function searchPostsAction(query: string, cursor?: string) {
  const { searchBlueskyPosts } = await import('@/lib/connectors/bluesky');
  return searchBlueskyPosts(query, cursor);
}