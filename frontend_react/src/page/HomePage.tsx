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
import { POST_TAGS, PostTag, TONE_BY_TAG, ToneKey } from '../config/tags';
import { PostSummary } from '../interface/Post';
import { fetchPostSummary } from '../service/post/postApi';
import { errorSummary, isAbort } from '../service/apiClient';
import { useCountUp } from '../hook/useCountUp';
import ErrorList from '../component/template/ErrorList';
import TriviaCard from '../component/trivia/TriviaCard';
import WelcomeCard from '../component/home/WelcomeCard';

/**
 * Dashboard trivia stays light on purpose: happy and neutral only, per the
 * product call that heartbreaking facts belong on their page, behind its
 * warning. Module-level so a re-render never hands `TriviaCard` a fresh array.
 */
const TRIVIA_TONES: ToneKey[] = ['happy', 'neutral'];

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
          {/* An eyebrow, not a heading: subtitle2's default h6 element made the
              outline read h4 -> h6. */}
          <Typography variant="subtitle2" component="p" color="text.muted">
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
            aria-label={`${count} ${label.toLowerCase()} ${count === 1 ? 'post' : 'posts'} this week`}
          >
            {shown}
          </Typography>
        )}

        <Typography
          variant="body2"
          color="text.muted"
          sx={{ mt: 0.5 }}
          // The count's aria-label above already says "posts this week"; a
          // screen reader was hearing "0 happy posts this week posts this week".
          aria-hidden="true"
        >
          {count === 1 ? 'post this week' : 'posts this week'}
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
 * The counts cover a rolling week and are scoped like the feeds - people you
 * follow plus yourself - so a card reading 12 and its feed are the same claim.
 * The API decides the window and reports the dates it used; this page states
 * them rather than working them out from the browser's clock.
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
          ? 'Here is what the people you follow have shared this past week.'
          : 'Nothing shared this past week. Yours could be the first.'}
      </Typography>

      <ErrorList errors={errors} />

      {/* Above the counters because it explains them - including why they read
          zero on a brand-new account. */}
      <WelcomeCard />

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
        // The window is bounded by the API's midnight, which need not be the
        // browser's, so the days it measured are stated rather than implied.
        <Typography variant="body2" color="text.muted" sx={{ mt: 2 }}>
          Counted from {summary.from} to {summary.to}.
        </Typography>
      )}

      <Box sx={{ mt: 3 }}>
        <TriviaCard tones={TRIVIA_TONES} />
      </Box>
    </Container>
  );
};

export default HomePage;
