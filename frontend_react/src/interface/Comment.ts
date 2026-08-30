export interface Comment {
  // Mongo document ids are UUID strings, not integers.
  id: string;
  postId: string;
  authorId: string;
  /**
   * The author's current name, resolved from the account at render time rather
   * than copied onto the comment - so a rename is correct everywhere at once.
   *
   * Null when the account is gone. The comment survives: it is content, and a
   * thread reads worse with holes punched in it than with one entry whose
   * author cannot be named.
   */
  authorName: string | null;
  /** Absolute URL, or null. Read live, for the same reason as the name. */
  authorAvatar: string | null;
  content: string;
  createdAt: string;
}
