import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Avatar,
  Stack,
} from '@mui/material';
import { Post } from '../interface/Post';
import { useAuth } from '../AuthContext';
import { fetchPosts, addPost as addPostApi } from '../service/post/postApi';
import { getUser as getUserApi } from '../service/user/userApi';
import LoadingIndicator from '../component/template/LoadingIndicator';
import { useParams } from 'react-router-dom';
import { User } from '../interface/User';

const ProfilePage: React.FC = () => {
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [editId, setEditId] = useState(null);
  const { token } = useAuth()!;
  const isEditing = editId !== null;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      try {
        const data: User = await getUserApi({ id, token });
        setUser(data);
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
              {isEditing ? (
                <TextField multiline fullWidth value={post.content} autoFocus />
              ) : (
                <Typography variant="body1">{post.content}</Typography>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default ProfilePage;
