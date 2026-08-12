import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import {
  followUser as followUserApi,
  unfollowUser as unfollowUserApi,
} from '../../service/user/userFollowApi';
import { errorSummary } from '../../service/apiClient';
import { useNotify } from '../template/ToastProvider';
import { User } from '../../interface/User';

interface PersonRowProps {
  person: User;
  /** Why this person is being suggested, when they are. */
  reason?: string;
}

const countLabel = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/**
 * One person in a list: picture, name, what they have posted, and a follow
 * button. Shared by the followers list, the following list and the suggestions,
 * so those three cannot drift apart.
 *
 * The button's state comes from `is_following` on the payload, which the API
 * hydrates per row - the alternative was one `exists()` query per person.
 */
const PersonRow: React.FC<PersonRowProps> = ({ person, reason }) => {
  const { token, currentUser } = useAuth();
  const notify = useNotify();
  const [following, setFollowing] = useState<boolean>(
    person.is_following ?? false
  );
  const [busy, setBusy] = useState<boolean>(false);
  const isMe = currentUser?.id === person.id;

  const toggle = async () => {
    setBusy(true);

    try {
      if (following) {
        await unfollowUserApi({ id: person.id, token });
        setFollowing(false);
      } else {
        await followUserApi({ id: person.id, token });
        setFollowing(true);
      }
    } catch (error) {
      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const stats = person.stats;

  return (
    <Card variant="outlined">
      <CardContent
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 2,
          '&:last-child': { pb: 2 },
        }}
      >
        <Avatar
          src={person.avatar ?? undefined}
          alt=""
          sx={{ width: 48, height: 48 }}
        >
          {person.first_name.trim().charAt(0).toUpperCase() || '?'}
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            component={Link}
            to={isMe ? '/my_profile' : `/profile/${person.id}`}
            variant="body1"
            fontWeight={600}
            color="text.primary"
            sx={{
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            {`${person.first_name} ${person.last_name}`}
          </Typography>

          <Typography variant="body2" color="text.muted">
            {reason ??
              (stats
                ? `${countLabel(stats.posts, 'post', 'posts')} · ${countLabel(
                    stats.followers,
                    'follower',
                    'followers'
                  )}`
                : person.email)}
          </Typography>
        </Box>

        {/* No button on your own row: the API rejects following yourself, so
            offering it would only produce an error. */}
        {!isMe && (
          <Stack>
            <Button
              variant={following ? 'outlined' : 'contained'}
              size="small"
              loading={busy}
              onClick={toggle}
            >
              {following ? 'Unfollow' : 'Follow'}
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonRow;
