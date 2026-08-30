import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Link as MuiLink,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { useNotify } from '../template/ToastProvider';
import { TONE_LABEL, ToneKey } from '../../config/tags';

/** Left to right in the order the sidebar and the dashboard counters list them. */
const TONES: { tone: ToneKey; to: string; what: string }[] = [
  { tone: 'happy', to: '/happy_posts', what: 'reunions and adoptions' },
  { tone: 'neutral', to: '/neutral_posts', what: 'notices and intake logs' },
  {
    tone: 'heartbreaking',
    to: '/heartbreaking_posts',
    what: 'the hard ones, behind a warning',
  },
];

/**
 * First-run orientation on the dashboard.
 *
 * Two things the app never said out loud: what the three feeds are, and that
 * the counters stay at zero until you follow somebody. A new account used to
 * land on three zeros with neither explained.
 *
 * Deliberately not a modal - there is nothing to interrupt and nothing to
 * protect focus from - and deliberately dismissed through the account
 * preference rather than local state, so dismissing it on a phone does not
 * leave it waiting on a laptop. Absent preference means "not dismissed", which
 * is why the default shows it.
 */
const WelcomeCard: React.FC = () => {
  const { preferences, setPreference } = useAuth();
  const notify = useNotify();
  const [dismissed, setDismissed] = useState(false);

  if (preferences.dismissed_welcome === true || dismissed) {
    return null;
  }

  const dismiss = () => {
    // Optimistic, then reverted if the account refused: a card that vanishes
    // locally and returns on the next device is indistinguishable from a
    // broken button.
    setDismissed(true);

    setPreference('dismissed_welcome', true).catch(() => {
      setDismissed(false);
      notify({
        message: 'Could not save that - the card will appear again.',
        severity: 'error',
      });
    });
  };

  return (
    <Card
      variant="outlined"
      component="section"
      role="region"
      // Not "New here?" - `LoginForm` already uses that phrase for a different
      // purpose, and two surfaces sharing it makes both ambiguous.
      aria-label="Getting started"
      sx={{ mb: 3 }}
    >
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Getting started
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Stories live in three feeds, by how they land. Your dashboard counts
          the past week from the people you follow, so it stays quiet until you
          follow somebody.
        </Typography>

        <Stack spacing={1} sx={{ mb: 2.5 }}>
          {TONES.map(({ tone, to, what }) => (
            <Stack key={tone} direction="row" spacing={1} alignItems="baseline">
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: `tone.${tone}.main`,
                  flexShrink: 0,
                  // Nudged onto the text baseline rather than the line box.
                  mt: '6px',
                }}
              />
              <Typography variant="body2" color="text.secondary">
                <MuiLink component={RouterLink} to={to} color="primary">
                  {TONE_LABEL[tone]}
                </MuiLink>
                {` — ${what}.`}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            component={RouterLink}
            // NOT /users: that path is admin-gated, so `AdminRoute` bounced
            // every non-admin - the people this button exists for - straight to
            // the happy feed.
            to="/discover"
            size="small"
          >
            Find people to follow
          </Button>
          <Button size="small" color="inherit" onClick={dismiss}>
            Got it
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default WelcomeCard;
