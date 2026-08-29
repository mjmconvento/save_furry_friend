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

/**
 * Display names by tone key, for surfaces keyed by tone rather than post tag -
 * the trivia card gets its tone straight from the API in this vocabulary.
 */
export const TONE_LABEL: Record<ToneKey, string> = {
  happy: 'Happy',
  neutral: 'Neutral',
  heartbreaking: 'Heartbreaking',
};

/**
 * Total over `PostTag`, so one of our own tones always resolves. Prefer this
 * wherever the tag is known to be ours.
 */
export const TONE_BY_TAG: Record<PostTag, { tone: ToneKey; label: string }> = {
  [POST_TAGS.happy]: { tone: 'happy', label: TONE_LABEL.happy },
  [POST_TAGS.neutral]: { tone: 'neutral', label: TONE_LABEL.neutral },
  [POST_TAGS.heartbreaking]: {
    tone: 'heartbreaking',
    label: TONE_LABEL.heartbreaking,
  },
};

/**
 * The same data, widened for lookups by arbitrary post tag: a post may carry
 * anything, and one whose tags match nothing here gets no badge at all.
 */
export const POST_TONE_BY_TAG: Record<
  string,
  { tone: ToneKey; label: string } | undefined
> = TONE_BY_TAG;
