import React from 'react';
import PostFeed from '../component/post/PostFeed';

const NeutralPostPage: React.FC = () => (
  <PostFeed
    tag="neutral_post"
    title="Neutral Posts"
    subtitle="Notices, intake logs and the day-to-day."
  />
);

export default NeutralPostPage;
