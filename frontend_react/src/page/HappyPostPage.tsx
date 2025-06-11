import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  Stack,
} from '@mui/material';
import { Delete, Edit } from '@mui/icons-material';
import { Post } from '../interface/Post';
import { useAuth } from '../AuthContext';
import { fetchPosts, addPost as addPostApi } from '../service/post/postApi';
import Toast from '../component/template/Toast';
import ErrorList from '../component/template/ErrorList';
import ConfirmDeletePostDialog from '../component/post/delete/ConfirmDeletePostDialog';
import LoadingIndicator from '../component/template/LoadingIndicator';
import EditPostDialog from '../component/post/update/EditPostDialog';
import { Link } from 'react-router-dom';

const HappyPostPage: React.FC = () => {
  const [toastOpen, setToastOpen] = useState(false);
  const [newContent, setNewContent] = useState<string>('');
  const [newTags, setNewTags] = useState<string[]>(['happy_post']);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const loggedInUserId = localStorage.getItem('loggedInUserId');
  const [posts, setPosts] = useState<Post[]>([]);
  const { token } = useAuth()!;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>(
    'success'
  );

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const data: Post[] = await fetchPosts(token, ['happy_post', 'cs']);
        setPosts(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(
          error instanceof Error ? error.message : 'Something went wrong'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [token]);

  const handleOpenEditDialog = (post: Post) => {
    setEditingPost(post);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingPost(null);
  };

  const handleOpenDeleteDialog = (post: Post) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setPostToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleAddPost = async () => {
    setLoading(true);

    try {
      const newPost = await addPostApi({
        authorId: 1,
        authorName: 'test',
        content: newContent,
        tags: newTags,
        bearerToken: token,
      });

      setPosts((prevPosts) => [newPost, ...prevPosts]);
      setNewContent('');
      setNewTags([]);
      setToastOpen(true);
      setToastMessage('New post success.');
      setToastSeverity('success');
      setFormErrorSummary([]);
    } catch (error: any) {
      setFormErrorSummary(Object.values(error.list));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingIndicator message="Please wait..." />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Box maxWidth={1000} mx="auto" mt={4} px={2}>
      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        severity={toastSeverity}
      />

      <ErrorList errors={formErrorSummary} />

      <Typography variant="h5" mb={2} fontWeight="bold">
        Happy Posts
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            label="What's on your mind?"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            multiline
            rows={4}
          />

          <Box mt={2} textAlign="right">
            <Button variant="contained" onClick={handleAddPost}>
              Post
            </Button>
          </Box>
        </CardContent>
      </Card>

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
                  {post.authorName[0]}
                </Avatar>
              }
              title={
                <Link
                  to={
                    loggedInUserId == post.authorId
                      ? `/my_profile`
                      : `/profile/${post.authorId}`
                  }
                  style={{ textDecoration: 'none' }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight="bold"
                    color="text.primary"
                    sx={{ '&:hover': { textDecoration: 'underline' } }}
                  >
                    {post.authorName}
                  </Typography>
                </Link>
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

            {loggedInUserId == post.authorId ? (
              <CardActions sx={{ justifyContent: 'flex-end' }}>
                <IconButton aria-label="Edit">
                  <Edit onClick={() => handleOpenEditDialog(post)} />
                </IconButton>
                <IconButton color="error" aria-label="Delete">
                  <Delete onClick={() => handleOpenDeleteDialog(post)} />
                </IconButton>
              </CardActions>
            ) : null}
          </Card>
        ))}
      </Stack>

      <EditPostDialog
        open={isEditDialogOpen}
        handleCloseEditDialog={handleCloseEditDialog}
        editingPost={editingPost}
        setToastOpen={setToastOpen}
        setToastMessage={setToastMessage}
        setToastSeverity={setToastSeverity}
        setPosts={setPosts}
      />

      <ConfirmDeletePostDialog
        open={isDeleteDialogOpen}
        handleCloseDeleteDialog={handleCloseDeleteDialog}
        setPosts={setPosts}
        setLoading={setLoading}
        setToastOpen={setToastOpen}
        setToastMessage={setToastMessage}
        setToastSeverity={setToastSeverity}
        postToDelete={postToDelete}
      />
    </Box>
  );
};

export default HappyPostPage;
