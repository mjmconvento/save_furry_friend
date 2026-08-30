import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useAuth } from '../AuthContext';
import { fetchDiscoverable } from '../service/user/userFollowApi';
import { errorSummary, isAbort } from '../service/apiClient';
import PersonRow from '../component/user/PersonRow';
import ErrorList from '../component/template/ErrorList';
import { User } from '../interface/User';

/**
 * The people directory: everyone the viewer does not follow yet.
 *
 * Distinct from the "who to follow" prompt on the following list, which stays a
 * three-row nudge. This surface pages, and it includes members who have not
 * posted yet so a new account is findable at all.
 *
 * Followed rows deliberately stay put rather than disappearing: a list that
 * removes what you just clicked jumps under the cursor and takes the undo away
 * with it. `PersonRow` flips its own button to Following.
 */
const DiscoverPage: React.FC = () => {
  const { token } = useAuth();
  const [people, setPeople] = useState<User[]>([]);
  const [page, setPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const {
          items,
          page: current,
          lastPage: last,
        } = await fetchDiscoverable(token, 1, controller.signal);

        setPeople(items);
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
  }, [token]);

  const loadMore = async () => {
    setLoadingMore(true);

    try {
      const {
        items,
        page: current,
        lastPage: last,
      } = await fetchDiscoverable(token, page + 1);

      // Following somebody shifts the ranking, so page two can repeat a row
      // already on screen. React would throw on the duplicate key.
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
    <Container maxWidth="md" disableGutters>
      <Typography variant="h4" component="h1" gutterBottom>
        Find people to follow
      </Typography>
      <Typography variant="body1" color="text.muted" sx={{ mb: 3 }}>
        Ordered by who has posted most in the last month. Following someone puts
        their stories in your feeds and your weekly counts.
      </Typography>

      <ErrorList errors={errors} />

      {!loading && people.length === 0 && errors.length === 0 && (
        <Typography variant="body1" color="text.muted">
          You already follow everyone here. Nothing left to discover for now.
        </Typography>
      )}

      <Stack spacing={1.5}>
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            reason={
              person.stats
                ? `${person.stats.posts} posts · ${person.stats.followers} followers`
                : undefined
            }
          />
        ))}
      </Stack>

      {page < lastPage && (
        <Box mt={3} textAlign="center">
          <Button variant="outlined" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default DiscoverPage;
