import React from 'react';
import PostFeed from '../component/post/PostFeed';
import HeartbreakingWarning from '../component/post/HeartbreakingWarning';
import { POST_TAGS } from '../config/tags';

/**
 * The feed is inside the warning rather than beside it: `PostFeed` fetches on
 * mount, so this is what keeps the posts and their photos from loading until the
 * reader has said yes.
 */
const HeartbreakingPostPage: React.FC = () => (
  <HeartbreakingWarning>
    <PostFeed
      tag={POST_TAGS.heartbreaking}
      title="Heartbreaking Posts"
      subtitle="The hard ones. Read them anyway."
    />
  </HeartbreakingWarning>
);

export default HeartbreakingPostPage;
