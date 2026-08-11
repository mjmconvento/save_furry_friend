import React from 'react';
import PostFeed from '../component/post/PostFeed';
import { POST_TAGS } from '../config/tags';

const NeutralPostPage: React.FC = () => (
  <PostFeed
    tag={POST_TAGS.neutral}
    title="Neutral Posts"
    subtitle="Notices, intake logs and the day-to-day."
  />
);

export default NeutralPostPage;
