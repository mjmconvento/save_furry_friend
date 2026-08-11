import { Theme } from '@mui/material/styles';

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

/**
 * A tone key indexes `theme.palette.tone`, so adding a category is one entry
 * here plus one hue in the theme. This lives beside the vocabulary rather than
 * in `PostCard` because it is data, not component code.
 */
export type ToneKey = keyof Theme['palette']['tone'];

/** A post whose tags match nothing here gets no badge at all. */
export const POST_TONE_BY_TAG: Record<
  string,
  { tone: ToneKey; label: string }
> = {
  [POST_TAGS.happy]: { tone: 'happy', label: 'Happy' },
  [POST_TAGS.neutral]: { tone: 'neutral', label: 'Neutral' },
  [POST_TAGS.heartbreaking]: {
    tone: 'heartbreaking',
    label: 'Heartbreaking',
  },
};
