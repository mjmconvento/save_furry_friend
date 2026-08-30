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
 * The words for affirming a post, per tone.
 *
 * "Like" on a story about an animal that ran out of time reads badly, so the
 * wording follows the tone the way the colour already does. Same data, same
 * count - only the label and the icon differ.
 *
 * `past` completes "See who ___ this" on the control that opens the roster;
 * `rosterTitle` titles the dialog it opens.
 */
export const TONE_AFFIRM: Record<
  ToneKey,
  { verb: string; undo: string; past: string; rosterTitle: string }
> = {
  happy: {
    verb: 'Like',
    undo: 'Unlike',
    past: 'liked',
    rosterTitle: 'Liked by',
  },
  neutral: {
    verb: 'Like',
    undo: 'Unlike',
    past: 'liked',
    rosterTitle: 'Liked by',
  },
  heartbreaking: {
    verb: 'Remember',
    undo: 'Undo remember',
    past: 'remembered',
    rosterTitle: 'Remembered by',
  },
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
