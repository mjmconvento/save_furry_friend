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
import { Delete, Edit, Save } from '@mui/icons-material';
import { Post } from '../interface/Post';
import { useAuth } from '../AuthContext';
import { fetchPosts, addPost as addPostApi } from '../service/post/postApi';
import Toast from '../component/template/Toast';
import ErrorList from '../component/template/ErrorList';

const HappyPostPage: React.FC = () => {
  const [toastOpen, setToastOpen] = useState(false);
  const [newTitle, setNewTitle] = useState<string>('Title placeholder');
  const [newAuthor, setNewAuthor] = useState<string>('1');
  const [newContent, setNewContent] = useState<string>('');
  const [newTags, setNewTags] = useState<string[]>(['happy_post']);

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [editId, setEditId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const { token } = useAuth()!;
  const isEditing = editId !== null;
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

  const handleAddPost = async () => {
    try {
      const newPost = await addPostApi({
        title: newTitle,
        author: newAuthor,
        content: newContent,
        tags: newTags,
        bearerToken: token,
      });

      setPosts((prevPosts) => [newPost, ...prevPosts]);
      setNewTitle('');
      setNewAuthor('');
      setNewContent('');
      setNewTags([]);
      setToastMessage('Add new post success.');
      setToastSeverity('success');
      setFormErrorSummary([]);
    } catch (error: any) {
      setFormErrorSummary(Object.values(error.list));
    }
  };

  const handleDeletePost = (id: any) => {};

  const handleEditPost = (id: any, content: any) => {};

  const handleSaveEdit = () => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === editId ? { ...post, content: editContent } : post
      )
    );
    setEditId(null);
    setEditContent('');
  };

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
            rows={2}
          />
          <Box mt={2} textAlign="right">
            <Button variant="contained" onClick={handleAddPost}>
              Post
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {posts.map(({ id, content, createdAt, author }) => (
          <Card
            variant="outlined"
            sx={{ borderRadius: 2, mb: 2, boxShadow: 3 }}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {author?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              }
              title={
                <Typography variant="subtitle1" fontWeight="bold">
                  {author}
                </Typography>
              }
              subheader={
                <Typography variant="caption" color="text.secondary">
                  {new Date(createdAt).toLocaleString()}
                </Typography>
              }
              sx={{ paddingBottom: 0 }}
            />

            <CardContent>
              {isEditing ? (
                <TextField multiline fullWidth value={content} autoFocus />
              ) : (
                <Typography variant="body1">{content}</Typography>
              )}
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end' }}>
              {isEditing ? (
                <IconButton color="primary" aria-label="Save">
                  <Save />
                </IconButton>
              ) : (
                <IconButton aria-label="Edit">
                  <Edit />
                </IconButton>
              )}
              <IconButton color="error" aria-label="Delete">
                <Delete />
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </Stack>
    </Box>
  );
};

export default HappyPostPage;
