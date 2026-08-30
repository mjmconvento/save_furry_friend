import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import { useAuth } from '../../AuthContext';
import {
  addComment,
  deleteComment,
  fetchComments,
} from '../../service/post/commentApi';
import { errorSummary, isAbort } from '../../service/apiClient';
import { useNotify } from '../template/ToastProvider';
import ErrorList from '../template/ErrorList';
import { Comment } from '../../interface/Comment';

interface PostCommentsProps {
  postId: string;
  /** The post's author, who may remove anything hanging off their story. */
  postAuthorId: string;
  /** Kept in the card so the count on the button stays in step. */
  onCountChange: (delta: number) => void;
}

/**
 * One post's thread, rendered inline under the card.
 *
 * Mounted only once opened, so nothing is fetched for the nineteen other posts
 * on the page. Sorted oldest-first by the API, which is the order a
 * conversation reads in - unlike the feed, which is newest-first.
 */
const PostComments: React.FC<PostCommentsProps> = ({
  postId,
  postAuthorId,
  onCountChange,
}) => {
  const { token, currentUser } = useAuth();
  const notify = useNotify();
  const [comments, setComments] = useState<Comment[]>([]);
  const [page, setPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const {
          items,
          page: current,
          lastPage: last,
        } = await fetchComments(token, postId, 1, controller.signal);

        setComments(items);
        setPage(current);
        setLastPage(last);
        setErrors([]);
      } catch (error) {
        if (isAbort(error)) return;

        setErrors(errorSummary(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [token, postId]);

  const loadMore = async () => {
    try {
      const {
        items,
        page: current,
        lastPage: last,
      } = await fetchComments(token, postId, page + 1);

      setComments((previous) => {
        const seen = new Set(previous.map((entry) => entry.id));

        return [...previous, ...items.filter((entry) => !seen.has(entry.id))];
      });
      setPage(current);
      setLastPage(last);
    } catch (error) {
      setErrors(errorSummary(error));
    }
  };

  const submit = async () => {
    setSubmitting(true);

    try {
      const saved = await addComment({ postId, content, token });

      setComments((previous) => [...previous, saved]);
      setContent('');
      setErrors([]);
      onCountChange(1);
    } catch (error) {
      setErrors(errorSummary(error));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (comment: Comment) => {
    try {
      await deleteComment({ id: comment.id, token });

      setComments((previous) =>
        previous.filter((entry) => entry.id !== comment.id)
      );
      onCountChange(-1);
    } catch (error) {
      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    }
  };

  return (
    <Box
      sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}
    >
      <ErrorList errors={errors} />

      {loading && (
        <Typography variant="body2" color="text.muted">
          Loading…
        </Typography>
      )}

      <Stack spacing={1.5}>
        {comments.map((comment) => {
          // Either the comment's own author or the post's, matching
          // CommentPolicy - the button must not offer what the API refuses.
          const canRemove =
            currentUser?.id === comment.authorId ||
            currentUser?.id === postAuthorId;

          return (
            <Box key={comment.id} sx={{ display: 'flex', gap: 1.5 }}>
              <Avatar
                src={comment.authorAvatar ?? undefined}
                alt=""
                sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
              >
                {comment.authorName?.trim().charAt(0).toUpperCase() ?? '?'}
              </Avatar>

              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                  variant="body2"
                  component="span"
                  fontWeight={600}
                  color={
                    comment.authorName === null ? 'text.muted' : 'text.primary'
                  }
                >
                  {comment.authorName ?? 'Deleted account'}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: 'anywhere', maxWidth: '60ch' }}
                >
                  {comment.content}
                </Typography>
              </Box>

              {canRemove && (
                <IconButton
                  size="small"
                  aria-label="Delete comment"
                  onClick={() => remove(comment)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>
          );
        })}
      </Stack>

      {page < lastPage && (
        <Box mt={1.5}>
          <Button size="small" onClick={loadMore}>
            Earlier comments
          </Button>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 2 }}>
        <TextField
          label="Add a comment"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          size="small"
          fullWidth
          multiline
          maxRows={4}
        />
        <Button
          variant="contained"
          size="small"
          loading={submitting}
          disabled={content.trim() === ''}
          onClick={submit}
          // `flexShrink: 0` and no wrapping: the full-width field next to it
          // otherwise squeezed the label onto two lines.
          sx={{ mt: 0.5, flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          {/* Not just "Post": the feed composer above has its own Post button,
              and two controls with the same name is ambiguous to read and to
              hear. */}
          Post comment
        </Button>
      </Box>
    </Box>
  );
};

export default PostComments;
