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

const drawerWidth = 240;

const Sidebar = () => {
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
          <ListItemButton>
            <ListItemIcon>
              <MoodIcon />
            </ListItemIcon>
            <ListItemText primary="Happy Posts" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <MessageIcon />
            </ListItemIcon>
            <ListItemText primary="Neutral Posts" />
          </ListItemButton>
          <ListItemButton>
            <ListItemIcon>
              <HeartBrokenIcon />
            </ListItemIcon>
            <ListItemText primary="Heartbreaking Posts" />
          </ListItemButton>
          <ListItemButton selected>
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
