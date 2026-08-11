import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import { Post } from '../../interface/Post';
import { useAuth } from '../../AuthContext';
import { fetchPosts, addPost as addPostApi } from '../../service/post/postApi';
import { errorSummary } from '../../service/apiClient';
import Toast from '../template/Toast';
import ErrorList from '../template/ErrorList';
import ConfirmDeletePostDialog from './delete/ConfirmDeletePostDialog';
import LoadingIndicator from '../template/LoadingIndicator';
import EditPostDialog from './update/EditPostDialog';
import PostCard from './PostCard';
import { useDropzone } from 'react-dropzone';

interface PostFeedProps {
  /** The single tag this feed reads and writes, e.g. `happy_post`. */
  tag: string;
  title: string;
  subtitle: string;
}

/**
 * One category feed: composer plus the posts carrying `tag`. The three category
 * routes differ only by these props, so they are three-line wrappers around this
 * component rather than three copies of it.
 */
const PostFeed: React.FC<PostFeedProps> = ({ tag, title, subtitle }) => {
  const [toastOpen, setToastOpen] = useState(false);
  const [newContent, setNewContent] = useState<string>('');
  const [newTags, setNewTags] = useState<string[]>([tag]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const { token, currentUser } = useAuth()!;
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>(
    'success'
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: true,
    onDrop: (acceptedFiles, fileRejections) => {
      setSelectedFiles((prev) => [...prev, ...acceptedFiles]);

      // react-dropzone 18 dropped the bundled extension-to-MIME table, so a
      // file the browser hands over with an empty type (.heic is the common
      // one) no longer matches 'image/*'. Report rejections instead of
      // dropping them silently.
      setFormErrorSummary(
        fileRejections.map(
          ({ file, errors }) =>
            `${file.name}: ${errors.map((e) => e.message).join(', ')}`
        )
      );
    },
  });

  const [imageSizes, setImageSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const getImageDimensions = (url: string) => {
    const { promise, resolve } =
      Promise.withResolvers<{ width: number; height: number }>();
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = url;
    return promise;
  };

  useEffect(() => {
    const loadSizes = async () => {
      const sizes: Record<string, { width: number; height: number }> = {};

      for (const post of posts) {
        for (const url of post.medias ?? []) {
          if (!sizes[url]) {
            const size = await getImageDimensions(url);
            sizes[url] = size;
          }
        }
      }

      setImageSizes(sizes);
    };

    if (posts.length > 0) loadSizes();
  }, [posts]);

  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);

      try {
        const data: Post[] = await fetchPosts(token, [tag]);
        setPosts(data);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError(
          error instanceof Error ? error.message : 'Something went wrong'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [token, tag]);

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
        authorId: currentUser?.id,
        authorName: currentUser?.name,
        content: newContent,
        tags: newTags,
        medias: selectedFiles,
        bearerToken: token,
      });

      setPosts((prevPosts) => [newPost, ...prevPosts]);
      setNewContent('');
      // Back to this feed's tag, not empty: an emptied tag list would make the
      // next post from this page untagged, and an untagged post appears in no
      // feed at all.
      setNewTags([tag]);
      setSelectedFiles([]);
      setToastOpen(true);
      setToastMessage('New post success.');
      setToastSeverity('success');
      setFormErrorSummary([]);
    } catch (error: unknown) {
      setFormErrorSummary(errorSummary(error));
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
    <Box maxWidth={1000} mx="auto" mt={{ xs: 2, sm: 4 }} px={{ xs: 1.5, sm: 2 }}>
      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        severity={toastSeverity}
      />

      <ErrorList errors={formErrorSummary} />

      <Typography
        variant="h3"
        // 32px is a lot of ink on a 390px screen; the variant itself stays put.
        sx={{ fontSize: { xs: '1.625rem', sm: '2rem' } }}
      >
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" mb={2}>
        {subtitle}
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

          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: { xs: 1.5, sm: 2 },
              mt: 2,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: 'surface.sunken',
              '&:hover': { bgcolor: 'primary.light' },
            }}
          >
            <input {...getInputProps()} />
            <Typography variant="body2">
              {isDragActive
                ? 'Drop the files here...'
                : 'Drag and drop images here, or click to select'}
            </Typography>
          </Box>

          {selectedFiles.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              mt={2}
              flexWrap="wrap"
              // Stack spaces children with margins, so wrapped lines get no
              // vertical gap of their own. Only two previews fit per line on a
              // phone, so add one there; the desktop row never wraps.
              sx={{ rowGap: { xs: 1, md: 0 } }}
            >
              {selectedFiles.map((file, idx) => (
                <Box
                  key={idx}
                  component="img"
                  src={URL.createObjectURL(file)}
                  alt={`preview-${idx}`}
                  sx={{
                    width: 100,
                    height: 100,
                    objectFit: 'cover',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              ))}
            </Stack>
          )}

          <Box mt={2} textAlign="right">
            <Button variant="contained" onClick={handleAddPost}>
              Post
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {posts.map((post) => {
          const isOwner = currentUser?.id === String(post.authorId);

          return (
            <PostCard
              key={post.id}
              post={post}
              isOwner={isOwner}
              profileTo={isOwner ? '/my_profile' : `/profile/${post.authorId}`}
              imageSizes={imageSizes}
              onEdit={handleOpenEditDialog}
              onDelete={handleOpenDeleteDialog}
            />
          );
        })}
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

export default PostFeed;
