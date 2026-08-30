import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '../../AuthContext';
import { fetchPostLikers } from '../../service/post/postApi';
import { errorSummary, isAbort } from '../../service/apiClient';
import PersonRow from '../user/PersonRow';
import ErrorList from '../template/ErrorList';
import { User } from '../../interface/User';

interface PostLikersDialogProps {
  postId: string;
  /** Tone-aware, e.g. "Liked by" or "Remembered by". */
  title: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Who affirmed a post.
 *
 * Fetched on open rather than with the feed: twenty posts a page, and most
 * rosters are never looked at. Closing does not discard what was loaded, so
 * reopening the same roster is instant - the dialog stays mounted and only its
 * `open` flag changes.
 *
 * Rows are `PersonRow`, so this is also somewhere to follow from, and the
 * follow button behaves exactly as it does in the follow lists.
 */
const PostLikersDialog: React.FC<PostLikersDialogProps> = ({
  postId,
  title,
  open,
  onClose,
}) => {
  const { token } = useAuth();
  const [people, setPeople] = useState<User[]>([]);
  const [page, setPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open || loaded) {
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);

      try {
        const {
          items,
          page: current,
          lastPage: last,
        } = await fetchPostLikers(token, postId, 1, controller.signal);

        setPeople(items);
        setPage(current);
        setLastPage(last);
        setLoaded(true);
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
  }, [open, loaded, token, postId]);

  const loadMore = async () => {
    setLoadingMore(true);

    try {
      const {
        items,
        page: current,
        lastPage: last,
      } = await fetchPostLikers(token, postId, page + 1);

      setPeople((previous) => {
        const seen = new Set(previous.map((person) => person.id));

        return [...previous, ...items.filter((person) => !seen.has(person.id))];
      });
      setPage(current);
      setLastPage(last);
    } catch (error) {
      setErrors(errorSummary(error));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <ErrorList errors={errors} />

        {loading && people.length === 0 && (
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" color="text.muted">
              Loading…
            </Typography>
          </Box>
        )}

        {loaded && people.length === 0 && errors.length === 0 && (
          <Typography variant="body2" color="text.muted" sx={{ py: 2 }}>
            Nobody yet.
          </Typography>
        )}

        <Stack spacing={1.5}>
          {people.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </Stack>

        {page < lastPage && (
          <Box mt={2} textAlign="center">
            <Button size="small" loading={loadingMore} onClick={loadMore}>
              Load more
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PostLikersDialog;
