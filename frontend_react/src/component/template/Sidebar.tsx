import React from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MessageIcon from '@mui/icons-material/Message';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import MoodIcon from '@mui/icons-material/Mood';
import HouseIcon from '@mui/icons-material/House';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

const drawerWidth = 240;

const Sidebar = () => {
  const location = useLocation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          top: 64,
          height: 'calc(100% - 64px)',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        <List component="nav" aria-label="main mailbox folders">
          <ListItemButton
            component={Link}
            to="/"
            selected={location.pathname === '/'}
          >
            <ListItemIcon>
              <HouseIcon />
            </ListItemIcon>
            <ListItemText primary="Home" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/happy_posts"
            selected={location.pathname === '/happy_posts'}
          >
            <ListItemIcon>
              <MoodIcon />
            </ListItemIcon>
            <ListItemText primary="Happy Posts" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/neutral_posts"
            selected={location.pathname === '/neutral_posts'}
          >
            <ListItemIcon>
              <MessageIcon />
            </ListItemIcon>
            <ListItemText primary="Neutral Posts" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/heartbreaking_posts"
            selected={location.pathname === '/heartbreaking_posts'}
          >
            <ListItemIcon>
              <HeartBrokenIcon />
            </ListItemIcon>
            <ListItemText primary="Heartbreaking Posts" />
          </ListItemButton>

          <ListItemButton
            component={Link}
            to="/users"
            selected={location.pathname === '/users'}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Users" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
