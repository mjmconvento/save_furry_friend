import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  Stack,
  Button,
} from '@mui/material';
import { Post } from '../interface/Post';
import { useAuth } from '../AuthContext';
import {
  followUser as followUserApi,
  unfollowUser as unfollowUserApi,
} from '../service/user/userFollowApi';

import { fetchPosts } from '../service/post/postApi';
import { getUser as getUserApi } from '../service/user/userApi';
import LoadingIndicator from '../component/template/LoadingIndicator';
import { useParams } from 'react-router-dom';
import { User } from '../interface/User';

const ProfilePage: React.FC = () => {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const { token } = useAuth()!;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  useEffect(() => {
    const getUser = async () => {
      try {
        const data: User = await getUserApi({ id, token });
        setUser(data);
        setIsFollowing(data.is_following);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Something went wrong'
        );
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [token]);

  const handleFollow = async () => {
    setLoading(true);

    try {
      await followUserApi({
        id: user?.id || '',
        token: token,
      });

      setIsFollowing(true);
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setLoading(true);

    try {
      const newPost = await unfollowUserApi({
        id: user?.id || '',
        token: token,
      });

      setIsFollowing(false);
    } catch (error: any) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data: Post[] = await fetchPosts(token, ['happy_post', 'cs'], id);
        setPosts(data);
      } catch (error) {
        setError(
          error instanceof Error ? error.message : 'Something went wrong'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [token]);

  if (loading) {
    return <LoadingIndicator message="Please wait..." />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Box maxWidth={1000} mx="auto" mt={4} px={2}>
      <Typography variant="h5" mb={2} fontWeight="bold">
        {user?.first_name} {user?.last_name}'s Posts
      </Typography>

      <Box display="flex" justifyContent="flex-end" mb={2}>
        {isFollowing ? (
          <Button variant="contained" onClick={handleUnfollow}>
            Unfollow
          </Button>
        ) : (
          <Button variant="contained" onClick={handleFollow}>
            Follow
          </Button>
        )}
      </Box>

      <Stack spacing={2}>
        {posts.map((post) => (
          <Card
            variant="outlined"
            sx={{ borderRadius: 2, mb: 2, boxShadow: 3 }}
            key={post.id}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {post.authorName}
                </Avatar>
              }
              title={
                <Typography variant="subtitle1" fontWeight="bold">
                  {post.authorName}
                </Typography>
              }
              subheader={
                <Typography variant="caption" color="text.secondary">
                  {new Date(post.createdAt).toLocaleString()}
                </Typography>
              }
              sx={{ paddingBottom: 0 }}
            />

            <CardContent>
              <Typography variant="body1">{post.content}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default ProfilePage;
