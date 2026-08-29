import React from 'react';
import { Box } from '@mui/material';
import PostFeed from '../component/post/PostFeed';
import TriviaCard from '../component/trivia/TriviaCard';
import { POST_TAGS, ToneKey } from '../config/tags';

/** Module-level so a re-render never hands `TriviaCard` a fresh array. */
const TRIVIA_TONES: ToneKey[] = ['happy'];

const HappyPostPage: React.FC = () => (
  <>
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
      tag={POST_TAGS.happy}
      title="Happy Posts"
      subtitle="Reunions, adoptions and the good days."
    />
  </>
);

export default HappyPostPage;
