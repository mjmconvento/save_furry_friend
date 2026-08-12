import React, { useEffect, useState } from 'react';
import PostFeed from '../component/post/PostFeed';
import ProfileHeader from '../component/user/ProfileHeader';
import AvatarUpload from '../component/user/AvatarUpload';
import { useAuth } from '../AuthContext';
import { getUser as getUserApi } from '../service/user/userApi';
import { isAbort } from '../service/apiClient';
import { User } from '../interface/User';

/**
 * The signed-in user's own posts, across every category. No composer: a profile
 * has no category, so a composer here would have to invent a tag - which is how
 * the undefined `'cs'` tag and the untagged-post bug got in. Posting belongs on
 * a category feed.
 *
 * The header's counts come from `GET /api/users/{id}`, the only endpoint that
 * pays for them; the avatar comes from the cached session so it renders before
 * that request lands and updates the moment a new one is uploaded.
 */
const MyProfilePage: React.FC = () => {
  const { currentUser, token } = useAuth();
  const [stats, setStats] = useState<User['stats']>(null);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      try {
        const me = await getUserApi({
          id: currentUser.id,
          token,
          signal: controller.signal,
        });
        setStats(me.stats);
      } catch (error) {
        if (isAbort(error)) return;

        // The counts are decoration; the feed below is the page. A failure here
        // leaves them as dashes rather than replacing the profile with an error.
        setStats(null);
      }
    };

    load();

    return () => controller.abort();
  }, [currentUser, token]);

  // Null only mid-logout. Omitting `authorId` would widen the feed to every
  // user's posts instead of narrowing it, so render nothing rather than the
  // wrong feed.
  if (!currentUser) return null;

  return (
    <>
      <ProfileHeader
        name={currentUser.name}
        avatar={currentUser.avatar}
        stats={stats}
        action={<AvatarUpload />}
        listBase={`/profile/${currentUser.id}`}
      />

      <PostFeed
        authorId={currentUser.id}
        composer={false}
        title="My Posts"
        subtitle="Everything you have posted, newest first."
      />
    </>
  );
};

export default MyProfilePage;
