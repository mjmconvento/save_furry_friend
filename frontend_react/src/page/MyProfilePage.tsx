import React from 'react';
import PostFeed from '../component/post/PostFeed';
import { useAuth } from '../AuthContext';

/**
 * The signed-in user's own posts, across every category. No composer: a profile
 * has no category, so a composer here would have to invent a tag - which is how
 * the undefined `'cs'` tag and the untagged-post bug got in. Posting belongs on
 * a category feed.
 */
const MyProfilePage: React.FC = () => {
  const { currentUser } = useAuth();

  // Null only mid-logout. Omitting `authorId` would widen the feed to every
  // user's posts instead of narrowing it, so render nothing rather than the
  // wrong feed.
  if (!currentUser) return null;

  return (
    <PostFeed
      authorId={currentUser.id}
      composer={false}
      title="My Posts"
      subtitle="Everything you have posted, newest first."
    />
  );
};

export default MyProfilePage;
