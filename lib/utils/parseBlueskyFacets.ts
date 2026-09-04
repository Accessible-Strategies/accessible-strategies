export interface FacetSegment {
  text: string;
  type: 'text' | 'link' | 'mention' | 'tag';
  href?: string;
}

/**
 * Bluesky posts are always plain text — clickable spans (links,
 * @mentions, #hashtags) are described separately via a `facets` array
 * using BYTE offsets into the UTF-8 encoding of the text, not character
 * offsets. A naive string.slice() breaks on any text containing emoji
 * or multi-byte characters, so this encodes/decodes through UTF-8
 * byte arrays to slice correctly.
 */
export function parseBlueskyFacets(text: string, facets: any[] | undefined): FacetSegment[] {
  if (!facets || facets.length === 0) {
    return [{ text, type: 'text' }];
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(text);

  const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);
  const segments: FacetSegment[] = [];
  let cursor = 0;

  for (const facet of sorted) {
    const { byteStart, byteEnd } = facet.index;
    if (byteStart > cursor) {
      segments.push({ text: decoder.decode(bytes.slice(cursor, byteStart)), type: 'text' });
    }

    const segmentText = decoder.decode(bytes.slice(byteStart, byteEnd));
    const feature = facet.features?.[0];

    if (feature?.$type === 'app.bsky.richtext.facet#link') {
      segments.push({ text: segmentText, type: 'link', href: feature.uri });
    } else if (feature?.$type === 'app.bsky.richtext.facet#mention') {
      segments.push({ text: segmentText, type: 'mention', href: `https://bsky.app/profile/${feature.did}` });
    } else if (feature?.$type === 'app.bsky.richtext.facet#tag') {
      segments.push({ text: segmentText, type: 'tag', href: `https://bsky.app/hashtag/${feature.tag}` });
    } else {
      segments.push({ text: segmentText, type: 'text' });
    }

    cursor = byteEnd;
  }

  if (cursor < bytes.length) {
    segments.push({ text: decoder.decode(bytes.slice(cursor)), type: 'text' });
  }

  return segments;
}