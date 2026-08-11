import React from 'react';
import PostFeed from '../component/post/PostFeed';
import { POST_TAGS } from '../config/tags';

const HeartbreakingPostPage: React.FC = () => (
  <PostFeed
    tag={POST_TAGS.heartbreaking}
    title="Heartbreaking Posts"
    subtitle="The hard ones. Read them anyway."
  />
);

export default HeartbreakingPostPage;
