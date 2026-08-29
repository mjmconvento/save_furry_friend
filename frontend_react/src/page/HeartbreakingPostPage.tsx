import React from 'react';
import { Box } from '@mui/material';
import PostFeed from '../component/post/PostFeed';
import HeartbreakingWarning from '../component/post/HeartbreakingWarning';
import TriviaCard from '../component/trivia/TriviaCard';
import { POST_TAGS, ToneKey } from '../config/tags';

/** Module-level so a re-render never hands `TriviaCard` a fresh array. */
const TRIVIA_TONES: ToneKey[] = ['heartbreaking'];

/**
 * The feed AND the trivia are inside the warning rather than beside it: both
 * fetch on mount, so this is what keeps upsetting content - posts, photos and
 * facts alike - from loading until the reader has said yes.
 */
const HeartbreakingPostPage: React.FC = () => (
  <HeartbreakingWarning>
    {/* Same width envelope as the feed below, so the card sits flush over it. */}
    <Box
      maxWidth={1000}
      mx="auto"
      mt={{ xs: 2, sm: 4 }}
      px={{ xs: 1.5, sm: 2 }}
    >
      <TriviaCard tones={TRIVIA_TONES} />
    </Box>
    <PostFeed
      tag={POST_TAGS.heartbreaking}
      title="Heartbreaking Posts"
      subtitle="The hard ones. Read them anyway."
    />
  </HeartbreakingWarning>
);

export default HeartbreakingPostPage;
