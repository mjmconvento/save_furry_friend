export interface Post {
  // Mongo document ids are UUID strings, not integers.
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  /**
   * Absolute URL, or null. Read from the account at render time rather than
   * denormalized into the post, so it never shows a picture the author replaced.
   */
  authorAvatar: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  medias: string[];
  /**
   * How many accounts have affirmed this post. The roster is deliberately not
   * served: the count is public, who liked it is not.
   */
  likeCount: number;
  /** Whether the account reading this has affirmed it. */
  likedByViewer: boolean;
  /** How many comments hang off this post. The thread itself loads on demand. */
  commentCount: number;
}

/**
 * Post counts per tone over the last week, as `GET /api/posts/summary` reports
 * it.
 *
 * `from` and `to` are the inclusive days the API counted, in its own timezone -
 * which need not be the browser's, so the page shows these rather than working
 * the week out locally. The API owns the window length: widen it there and this
 * needs no change.
 *
 * Counts are partial by declaration: the API sends every tone, and reading with
 * `?? 0` keeps a future tone from rendering `undefined`.
 */
export interface PostSummary {
  from: string;
  to: string;
  counts: Partial<Record<string, number>>;
}
