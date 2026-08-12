import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { Post } from '../../interface/Post';
import { PostTag } from '../../config/tags';
import { useAuth } from '../../AuthContext';
import { fetchPosts, addPost as addPostApi } from '../../service/post/postApi';
import { errorSummary, isAbort } from '../../service/apiClient';
import { useNotify } from '../template/ToastProvider';
import ErrorList from '../template/ErrorList';
import ConfirmDeletePostDialog from './delete/ConfirmDeletePostDialog';
import LoadingIndicator from '../template/LoadingIndicator';
import EditPostDialog from './update/EditPostDialog';
import PostCard from './PostCard';

interface PostFeedProps {
  title: string;
  subtitle: string;
  /**
   * The single tag this feed reads and writes, e.g. `happy_post`. Omitted means
   * no tag filter: every post the other filters allow.
   */
  tag?: PostTag;
  /** Restrict the feed to one author's posts. */
  authorId?: string;
  /**
   * Composers write this feed's `tag`, so a feed without one cannot offer a
   * composer: an untagged post appears in no category feed at all.
   */
  composer?: boolean;
}

/**
 * Photoswipe needs the intrinsic size of every image up front, otherwise the
 * lightbox opens at a guessed aspect ratio and snaps to the real one.
 */
const getImageDimensions = (url: string) => {
  const { promise, resolve } = Promise.withResolvers<{
    width: number;
    height: number;
  }>();
  const img = new Image();
  img.onload = () =>
    resolve({ width: img.naturalWidth, height: img.naturalHeight });
  img.src = url;
  return promise;
};

/**
 * Every post surface in the app: the three category feeds, the signed-in user's
 * profile and another user's profile differ only by `tag`, `authorId` and
 * whether they compose, so they are wrappers around this component rather than
 * copies of it.
 */
const PostFeed: React.FC<PostFeedProps> = ({
  title,
  subtitle,
  tag,
  authorId,
  composer = true,
}) => {
  const [newContent, setNewContent] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const { token, currentUser } = useAuth();
  const notify = useNotify();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const [imageSizes, setImageSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const [page, setPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const moreRequest = useRef<AbortController | null>(null);

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

  // A blob URL minted during render leaks one URL per selected file on every
  // keystroke in the composer. Mint them once per file list and revoke them
  // when that list is replaced or the feed unmounts.
  const previews = useMemo(
    () =>
      selectedFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [selectedFiles]
  );

  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews]
  );

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
    // Navigating between two feeds (or two profiles) leaves the first
    // request in flight; without this, its late response overwrites the
    // newer feed's posts.
    const controller = new AbortController();

    const loadPosts = async () => {
      setLoading(true);

      try {
        const {
          items,
          page: current,
          lastPage: last,
        } = await fetchPosts(
          token,
          tag ? [tag] : [],
          authorId ?? null,
          controller.signal
        );
        setPosts(items);
        setPage(current);
        setLastPage(last);
        setError(null);
      } catch (error) {
        if (isAbort(error)) return;

        setError(
          error instanceof Error ? error.message : 'Something went wrong'
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadPosts();

    // A load-more still in flight belongs to the feed being left, so it is
    // abandoned here too rather than appending its posts to the new one.
    return () => {
      controller.abort();
      moreRequest.current?.abort();
    };
  }, [token, tag, authorId]);

  const handleLoadMore = async () => {
    const controller = new AbortController();
    moreRequest.current = controller;
    setLoadingMore(true);

    try {
      const {
        items,
        page: current,
        lastPage: last,
      } = await fetchPosts(
        token,
        tag ? [tag] : [],
        authorId ?? null,
        controller.signal,
        page + 1
      );

      // Rows shift between pages when anyone posts while the feed is open, so
      // page 2 can repeat something already on screen. React would then throw
      // on the duplicate key.
      setPosts((prevPosts) => {
        const seen = new Set(prevPosts.map((post) => post.id));

        return [...prevPosts, ...items.filter((post) => !seen.has(post.id))];
      });
      setPage(current);
      setLastPage(last);
    } catch (error) {
      if (isAbort(error)) return;

      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    } finally {
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  };

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
    // A mutation must not unmount the feed: the old page-level spinner threw
    // away scroll position and any text still in the composer.
    setSubmitting(true);

    try {
      const newPost = await addPostApi({
        content: newContent,
        tags: tag ? [tag] : [],
        medias: selectedFiles,
        bearerToken: token,
      });

      setPosts((prevPosts) => [newPost, ...prevPosts]);
      setNewContent('');
      setSelectedFiles([]);
      setFormErrorSummary([]);
      notify({ message: 'New post success.', severity: 'success' });
    } catch (error: unknown) {
      setFormErrorSummary(errorSummary(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator message="Please wait..." />;
  }

  if (error) {
    return (
      <Box
        maxWidth={1000}
        mx="auto"
        mt={{ xs: 2, sm: 4 }}
        px={{ xs: 1.5, sm: 2 }}
      >
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

      {composer && (
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

            {previews.length > 0 && (
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
                {previews.map((preview) => (
                  <Box
                    key={preview.url}
                    component="img"
                    src={preview.url}
                    alt={`preview of ${preview.file.name}`}
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
              <Button
                variant="contained"
                loading={submitting}
                onClick={handleAddPost}
              >
                Post
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

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

      {page < lastPage && (
        <Box mt={3} textAlign="center">
          <Button
            variant="outlined"
            loading={loadingMore}
            onClick={handleLoadMore}
          >
            Load more
          </Button>
        </Box>
      )}

      <EditPostDialog
        open={isEditDialogOpen}
        post={editingPost}
        onClose={handleCloseEditDialog}
        onSaved={(saved) =>
          setPosts((prevPosts) =>
            prevPosts.map((post) => (post.id === saved.id ? saved : post))
          )
        }
      />

      <ConfirmDeletePostDialog
        open={isDeleteDialogOpen}
        post={postToDelete}
        onClose={handleCloseDeleteDialog}
        onDeleted={(deletedId) =>
          setPosts((prevPosts) =>
            prevPosts.filter((post) => post.id !== deletedId)
          )
        }
      />
    </Box>
  );
};

export default PostFeed;
