import React, { useEffect, useState } from 'react';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  fetchFollowers,
  fetchFollowing,
  fetchSuggestions,
} from '../service/user/userFollowApi';
import { getUser as getUserApi } from '../service/user/userApi';
import { errorSummary, isAbort } from '../service/apiClient';
import PersonRow from '../component/user/PersonRow';
import ErrorList from '../component/template/ErrorList';
import { User } from '../interface/User';

interface FollowListPageProps {
  /** Which side of the graph to list. */
  mode: 'followers' | 'following';
}

const COPY = {
  followers: {
    title: 'Followers',
    mine: 'People who follow you',
    theirs: (name: string) => `People who follow ${name}`,
    empty: 'Nobody yet.',
  },
  following: {
    title: 'Following',
    mine: 'People you follow',
    theirs: (name: string) => `People ${name} follows`,
    empty: 'Not following anyone yet.',
  },
} as const;

/**
 * The two sides of the follow graph, one component: they differ only by which
 * endpoint they read and what the heading says.
 *
 * Suggestions ride along on the *following* list, where "who else?" is the
 * question already being asked. They are only shown on your own list — telling
 * you who to follow while you look at somebody else's would be a non sequitur.
 */
const FollowListPage: React.FC<FollowListPageProps> = ({ mode }) => {
  const { id } = useParams();
  const { token, currentUser } = useAuth();
  const [people, setPeople] = useState<User[]>([]);
  const [page, setPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [subject, setSubject] = useState<User | null>(null);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);

  const copy = COPY[mode];
  const isMine = currentUser?.id === id;
  const load = mode === 'followers' ? fetchFollowers : fetchFollowing;

  useEffect(() => {
    if (id === undefined) {
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setLoading(true);

      try {
        const [list, person] = await Promise.all([
          load(token, id, 1, controller.signal),
          getUserApi({ id, token, signal: controller.signal }),
        ]);

        setPeople(list.items);
        setPage(list.page);
        setLastPage(list.lastPage);
        setSubject(person);
        setErrors([]);
      } catch (error) {
        if (isAbort(error)) return;

        setErrors(errorSummary(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    run();

    return () => controller.abort();
  }, [id, token, load]);

  useEffect(() => {
    if (mode !== 'following' || !isMine) {
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        setSuggestions(await fetchSuggestions(token, controller.signal));
      } catch (error) {
        if (isAbort(error)) return;

        // Suggestions are an extra; a failure here must not take the list with
        // it, so they simply do not appear.
        setSuggestions([]);
      }
    };

    run();

    return () => controller.abort();
  }, [mode, isMine, token]);

  const loadMore = async () => {
    if (id === undefined) {
      return;
    }

    setLoadingMore(true);

    try {
      const next = await load(token, id, page + 1);

      setPeople((previous) => {
        const seen = new Set(previous.map((person) => person.id));

        return [...previous, ...next.items.filter((p) => !seen.has(p.id))];
      });
      setPage(next.page);
      setLastPage(next.lastPage);
    } catch (error) {
      setErrors(errorSummary(error));
    } finally {
      setLoadingMore(false);
    }
  };

  const name = subject
    ? `${subject.first_name} ${subject.last_name}`.trim()
    : 'this person';

  return (
    <Container maxWidth="md" disableGutters>
      <Typography variant="h4" component="h1" gutterBottom>
        {copy.title}
      </Typography>
      <Typography variant="body1" color="text.muted" sx={{ mb: 1 }}>
        {isMine ? copy.mine : copy.theirs(name)}
      </Typography>
      <Typography
        component={Link}
        to={isMine ? '/my_profile' : `/profile/${id}`}
        variant="body2"
        sx={{ display: 'inline-block', mb: 3 }}
      >
        ← Back to profile
      </Typography>

      <ErrorList errors={errors} />

      {!loading && people.length === 0 && (
        <Typography variant="body1" color="text.muted" sx={{ mb: 3 }}>
          {copy.empty}
        </Typography>
      )}

      <Stack spacing={1.5}>
        {people.map((person) => (
          <PersonRow key={person.id} person={person} />
        ))}
      </Stack>

      {page < lastPage && (
        <Box mt={3} textAlign="center">
          <Button variant="outlined" loading={loadingMore} onClick={loadMore}>
            Load more
          </Button>
        </Box>
      )}

      {suggestions.length > 0 && (
        <Box mt={5}>
          <Typography variant="h5" component="h2" gutterBottom>
            Who to follow
          </Typography>
          <Typography variant="body2" color="text.muted" sx={{ mb: 2 }}>
            The people posting most that you are not following yet.
          </Typography>
          <Stack spacing={1.5}>
            {suggestions.map((person) => (
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
        </Box>
      )}
    </Container>
  );
};

export default FollowListPage;
