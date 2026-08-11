/**
 * The post tag vocabulary. Every feed filter, every badge and every tag option
 * in the edit dialog reads from here, so a category is one entry rather than a
 * literal repeated across pages. Literals drifted before this existed: an
 * undefined `'cs'` tag was queried by two profile pages and a misspelled
 * `'hearthbreaking_post'` was writable from the edit dialog, which hid the post
 * from every feed.
 */
export const POST_TAGS = {
  happy: 'happy_post',
  neutral: 'neutral_post',
  heartbreaking: 'heartbreaking_post',
} as const;

export type PostTag = (typeof POST_TAGS)[keyof typeof POST_TAGS];
