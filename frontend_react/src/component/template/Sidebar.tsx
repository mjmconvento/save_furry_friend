import React, { ReactNode } from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MessageIcon from '@mui/icons-material/Message';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import MoodIcon from '@mui/icons-material/Mood';
import HouseIcon from '@mui/icons-material/House';
import { Link, useLocation } from 'react-router-dom';

const drawerWidth = 240;

type NavItem = { label: string; to: string; icon: ReactNode };
type NavGroup = { label: string; items: NavItem[] };
type SidebarProps = {
  /** Overlay drawer state - only consulted below `md`. */
  open: boolean;
  onClose: () => void;
};

// Group labels are written in normal case - the theme's `subtitle2` variant
// does the uppercasing and letterspacing.
const navGroups: NavGroup[] = [
  {
    label: 'Feed',
    items: [
      { label: 'Home', to: '/', icon: <HouseIcon /> },
      { label: 'Happy Posts', to: '/happy_posts', icon: <MoodIcon /> },
      { label: 'Neutral Posts', to: '/neutral_posts', icon: <MessageIcon /> },
      {
        label: 'Heartbreaking Posts',
        to: '/heartbreaking_posts',
        icon: <HeartBrokenIcon />,
      },
    ],
  },
  {
    label: 'Community',
    items: [{ label: 'Users', to: '/users', icon: <PeopleIcon /> }],
  },
];

const Sidebar = ({ open, onClose }: SidebarProps) => {
  const location = useLocation();

  // One nav tree, two hosts: the temporary overlay below `md` and the
  // permanent rail from `md` up. Group data and item props live here only.
  const navContent = (
    <Box
      component="nav"
      aria-label="Sidebar"
      sx={{ overflow: 'auto', py: 2.5, px: 1.5 }}
    >
      {navGroups.map((group, groupIndex) => (
        <React.Fragment key={group.label}>
          <Typography
            component="div"
            variant="subtitle2"
            color="text.muted"
            sx={{ px: '13px', py: 1, mt: groupIndex === 0 ? 0 : 1.5 }}
          >
            {group.label}
          </Typography>
          <List disablePadding aria-label={group.label}>
            {group.items.map(({ label, to, icon }) => (
              <ListItemButton
                key={to}
                component={Link}
                to={to}
                selected={location.pathname === to}
                // Dismisses the overlay after a tap; the permanent drawer has
                // nothing to close, so this needs no breakpoint guard.
                onClick={onClose}
                sx={{ mb: '2px' }}
              >
                <ListItemIcon>{icon}</ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            ))}
          </List>
        </React.Fragment>
      ))}
    </Box>
  );

  return (
    <>
      {/*
       * Overlay drawer, below `md`. No `top` offset: it floats above the
       * AppBar over the full viewport height, and reserves no layout width.
       */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        {navContent}
      </Drawer>

      {/*
       * Docked drawer, `md` and up. It is the only one that reserves width in
       * the app's flex row, and only from `md` - at `xs` it takes none, so
       * mobile content is not pushed off-centre by an invisible rail.
       */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: { xs: 0, md: drawerWidth },
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            top: 64,
            height: 'calc(100% - 64px)',
            boxSizing: 'border-box',
          },
        }}
      >
        {navContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
