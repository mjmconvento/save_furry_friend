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
}

/**
 * Today's post count per tone, as `GET /api/posts/summary` reports it.
 *
 * `date` is the day the API counted, in its own timezone - which need not be the
 * browser's, so the page shows this rather than assuming "today" locally.
 *
 * Counts are partial by declaration: the API sends every tone, and reading with
 * `?? 0` keeps a future tone from rendering `undefined`.
 */
export interface PostSummary {
  date: string;
  counts: Partial<Record<string, number>>;
}
