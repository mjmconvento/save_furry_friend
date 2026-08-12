import React, { ReactNode } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';

interface ProfileHeaderProps {
  name: string;
  /** Absolute URL, or null for initials. */
  avatar: string | null;
  /** Null while loading, so the numbers appear together rather than as zeros. */
  stats: { posts: number; followers: number; following: number } | null;
  /** Follow button on someone else's profile, upload control on your own. */
  action?: ReactNode;
}

const Stat: React.FC<{ label: string; value: number | null }> = ({
  label,
  value,
}) => (
  <Box>
    <Typography variant="h6" component="p" lineHeight={1.2}>
      {value ?? '—'}
    </Typography>
    <Typography variant="caption" color="text.muted">
      {label}
    </Typography>
  </Box>
);

/**
 * Shared header for both profile surfaces: `/my_profile` and `/profile/:id`
 * differ only by their action, so they are one component rather than two that
 * drift apart.
 */
const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  avatar,
  stats,
  action,
}) => (
  <Card variant="outlined" sx={{ mb: 3 }}>
    <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2.5}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Avatar
          src={avatar ?? undefined}
          alt=""
          sx={{ width: 72, height: 72, fontSize: 28 }}
        >
          {name.trim().charAt(0).toUpperCase() || '?'}
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
            {name}
          </Typography>
          <Stack direction="row" spacing={3}>
            <Stat label="Posts" value={stats?.posts ?? null} />
            <Stat label="Followers" value={stats?.followers ?? null} />
            <Stat label="Following" value={stats?.following ?? null} />
          </Stack>
        </Box>

        {action}
      </Stack>
    </CardContent>
  </Card>
);

export default ProfileHeader;
