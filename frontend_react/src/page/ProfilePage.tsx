import React, { useEffect, useState } from 'react';
import { Alert, Box, Button } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  followUser as followUserApi,
  unfollowUser as unfollowUserApi,
} from '../service/user/userFollowApi';
import { getUser as getUserApi } from '../service/user/userApi';
import { errorSummary } from '../service/apiClient';
import { useNotify } from '../component/template/ToastProvider';
import LoadingIndicator from '../component/template/LoadingIndicator';
import PostFeed from '../component/post/PostFeed';
import ProfileHeader from '../component/user/ProfileHeader';
import { User } from '../interface/User';

const ProfilePage: React.FC = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const notify = useNotify();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // One request, one `setLoading(false)`. This page used to run two effects
  // that each cleared `loading` in their own `finally`, so whichever settled
  // first revealed the page while the other was still in flight. The posts
  // moved into <PostFeed>, which owns its own loading state.
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);

      try {
        const data: User = await getUserApi({ id, token });
        setUser(data);
        setIsFollowing(data.is_following ?? false);
        setError(null);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Something went wrong'
        );
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id, token]);

  const handleToggleFollow = async () => {
    if (!user) return;

    // A follow is not a page load: driving the page-level `loading` from here
    // replaced the whole profile with a full-viewport spinner on every click.
    setSubmitting(true);

    try {
      if (isFollowing) {
        await unfollowUserApi({ id: user.id, token });
        setIsFollowing(false);
      } else {
        await followUserApi({ id: user.id, token });
        setIsFollowing(true);
      }
    } catch (error) {
      // Previously a console.log, so a rejected follow left the button looking
      // like it had done nothing.
      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator message="Please wait..." />;
  }

  if (error) {
    return (
      <Box maxWidth={1000} mx="auto" mt={4} px={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box
      maxWidth={1000}
      mx="auto"
      mt={{ xs: 2, sm: 4 }}
      px={{ xs: 1.5, sm: 2 }}
    >
      <ProfileHeader
        name={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()}
        avatar={user?.avatar ?? null}
        stats={user?.stats ?? null}
        listBase={`/profile/${id}`}
        action={
          <Button
            variant="contained"
            loading={submitting}
            onClick={handleToggleFollow}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        }
      />

      <PostFeed
        authorId={id}
        composer={false}
        title="Posts"
        subtitle={`Everything ${user?.first_name ?? 'this user'} has posted.`}
      />
    </Box>
  );
};

export default ProfilePage;
