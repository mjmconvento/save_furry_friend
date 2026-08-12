import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { POST_TAGS, PostTag, TONE_BY_TAG } from '../config/tags';
import { PostSummary } from '../interface/Post';
import { fetchPostSummary } from '../service/post/postApi';
import { errorSummary, isAbort } from '../service/apiClient';
import { useCountUp } from '../hook/useCountUp';
import ErrorList from '../component/template/ErrorList';

/** Left to right in the order the sidebar lists the feeds. */
const TONES: { tag: PostTag; to: string; caution?: string }[] = [
  { tag: POST_TAGS.happy, to: '/happy_posts' },
  { tag: POST_TAGS.neutral, to: '/neutral_posts' },
  {
    tag: POST_TAGS.heartbreaking,
    to: '/heartbreaking_posts',
    // Said at the link as well as behind it: the feed itself asks for an
    // explicit yes, but nobody should have to click to find out why.
    caution: 'Upsetting content — you will be warned first',
  },
];

interface ToneCardProps {
  tag: PostTag;
  to: string;
  count: number;
  loading: boolean;
  caution?: string;
}

const ToneCard: React.FC<ToneCardProps> = ({
  tag,
  to,
  count,
  loading,
  caution,
}) => {
  const { tone, label } = TONE_BY_TAG[tag];
  // The hook runs regardless of `loading` so the number animates the moment the
  // real count replaces the zero it starts from.
  const shown = useCountUp(count);

  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 0 }}>
      <CardActionArea
        component={Link}
        to={to}
        sx={{ p: 2.5, height: '100%', alignItems: 'flex-start' }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: `tone.${tone}.main`,
            }}
          />
          <Typography variant="subtitle2" color="text.muted">
            {label}
          </Typography>
        </Stack>

        {loading ? (
          <CircularProgress size={28} sx={{ my: '6px' }} />
        ) : (
          <Typography
            variant="h3"
            component="p"
            sx={{ color: `tone.${tone}.main`, lineHeight: 1.2 }}
            // The animated value changes on every frame, so the accessible name
            // would be read as it ticks. Expose the real number instead.
            aria-label={`${count} ${label.toLowerCase()} ${count === 1 ? 'post' : 'posts'} today`}
          >
            {shown}
          </Typography>
        )}

        <Typography variant="body2" color="text.muted" sx={{ mt: 0.5 }}>
          {count === 1 ? 'post today' : 'posts today'}
        </Typography>

        {caution !== undefined && (
          <Typography
            variant="caption"
            sx={{ mt: 1, display: 'block', color: `tone.${tone}.main` }}
          >
            {caution}
          </Typography>
        )}
      </CardActionArea>
    </Card>
  );
};

/**
 * The landing page. `/` used to redirect straight to the happy feed, so the
 * sidebar's Home entry went nowhere of its own.
 *
 * The counts are scoped like the feeds - people you follow plus yourself - so a
 * card reading 3 and its feed showing 3 are the same claim.
 */
const HomePage: React.FC = () => {
  const { token, currentUser } = useAuth();
  const [summary, setSummary] = useState<PostSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setSummary(await fetchPostSummary(token, controller.signal));
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

  const counts = summary?.counts ?? {};
  const total = TONES.reduce((sum, { tag }) => sum + (counts[tag] ?? 0), 0);

  return (
    <Container maxWidth="lg" disableGutters>
      <Typography variant="h4" gutterBottom>
        {currentUser ? `Welcome back, ${currentUser.name}` : 'Welcome back'}
      </Typography>
      <Typography variant="body1" color="text.muted" sx={{ mb: 3 }}>
        {loading || total > 0
          ? 'Here is what the people you follow have shared today.'
          : 'Nothing shared today yet. Yours could be the first.'}
      </Typography>

      <ErrorList errors={errors} />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems="stretch"
      >
        {TONES.map(({ tag, to, caution }) => (
          <ToneCard
            key={tag}
            tag={tag}
            to={to}
            count={counts[tag] ?? 0}
            loading={loading}
            caution={caution}
          />
        ))}
      </Stack>

      {summary && (
        // The API counts its own midnight, which need not be the browser's, so
        // the day it measured is stated rather than implied.
        <Typography variant="body2" color="text.muted" sx={{ mt: 2 }}>
          Counted for {summary.date}.
        </Typography>
      )}
    </Container>
  );
};

export default HomePage;
