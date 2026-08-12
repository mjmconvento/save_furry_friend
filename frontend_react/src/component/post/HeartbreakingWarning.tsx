import React, { ReactNode, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { useNotify } from '../template/ToastProvider';

/**
 * Content warning for the heartbreaking feed.
 *
 * `children` is not rendered until the reader continues, which is the whole
 * point: `PostFeed` fetches on mount, so a banner layered over a live feed would
 * load the posts and their photos behind the notice warning about them.
 *
 * The warning appears on **every** visit until the account says otherwise, from
 * whichever link brought the reader here. It briefly remembered "continued" for
 * the whole browser session, which meant one click silently suppressed it for
 * ever after - a shortcut nobody asked for, and indistinguishable from the
 * warning being broken. The checkbox is the only way to stop it, because that is
 * the one the reader chooses deliberately.
 */
const HeartbreakingWarning: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { preferences, setPreference } = useAuth();
  const notify = useNotify();
  const [continued, setContinued] = useState<boolean>(false);
  const [remember, setRemember] = useState<boolean>(false);

  if (preferences.hide_heartbreaking_warning === true || continued) {
    return <>{children}</>;
  }

  const proceed = () => {
    setContinued(true);

    if (!remember) {
      return;
    }

    // Deliberately not awaited: the reader has consented either way, so a slow
    // or failed save must not hold up the page. It is reported rather than
    // swallowed, because silence would look like the box did not work.
    setPreference('hide_heartbreaking_warning', true).catch(() => {
      notify({
        message: 'Could not save that - the warning will appear again.',
        severity: 'error',
      });
    });
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 560, mx: 'auto', mt: { md: 4 } }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <HeartBrokenIcon sx={{ color: 'tone.heartbreaking.main' }} />
          <Typography variant="h5" component="h1">
            Before you read on
          </Typography>
        </Stack>

        <Typography variant="body1" sx={{ mb: 1.5 }}>
          These are the hard stories: strays nobody came back for, injuries left
          untreated, animals that ran out of time.
        </Typography>
        <Typography variant="body1" color="text.muted" sx={{ mb: 3 }}>
          They are here because they are true and because they matter. But they
          can genuinely upset you, and there is no shame in reading the other
          feeds instead today.
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
          }
          label="Don't show this warning again"
        />

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            justifyContent: 'flex-end',
            gap: 1.5,
            mt: 3,
          }}
        >
          <Button component={Link} to="/happy_posts" color="inherit">
            Take me to Happy Posts
          </Button>
          <Button variant="contained" onClick={proceed}>
            I understand, show the posts
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HeartbreakingWarning;
