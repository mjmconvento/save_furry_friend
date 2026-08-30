import React from 'react';
import PostFeed from '../component/post/PostFeed';
import HeartbreakingWarning from '../component/post/HeartbreakingWarning';
import { POST_TAGS } from '../config/tags';

/**
 * The feed AND its trivia are inside the warning rather than beside it: both
 * fetch on mount, so this is what keeps upsetting content - posts, photos and
 * facts alike - from loading until the reader has said yes.
 *
 * The subtitle honors the gate's promise ("there is no shame in reading the
 * other feeds instead today") rather than contradicting it: it used to command
 * "Read them anyway." sixty pixels after offering a way out. The composer
 * prompt is the product's own register, not small-talk idiom, because "What's
 * on your mind?" has no business sitting above stories like these.
 */
const HeartbreakingPostPage: React.FC = () => (
  <HeartbreakingWarning>
    <PostFeed
      tag={POST_TAGS.heartbreaking}
      title="Heartbreaking Posts"
      subtitle="The hard ones. They matter too."
      triviaTones={['heartbreaking']}
      composerPlaceholder="Tell their story"
    />
  </HeartbreakingWarning>
);

export default HeartbreakingPostPage;
