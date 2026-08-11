import React from 'react';
import PostFeed from '../component/post/PostFeed';
import { POST_TAGS } from '../config/tags';

const HappyPostPage: React.FC = () => (
  <PostFeed
    tag={POST_TAGS.happy}
    title="Happy Posts"
    subtitle="Reunions, adoptions and the good days."
  />
);

export default HappyPostPage;
