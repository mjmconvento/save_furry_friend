import React, { useState, useEffect, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  InputBase,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MenuIcon from '@mui/icons-material/Menu';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { searchUsers as searchUsersApi } from '../../service/user/userApi';
import { flushSync } from 'react-dom';

type TopbarProps = {
  /** Opens the overlay nav drawer; the button that calls it is hidden at `md`. */
  onMenuClick: () => void;
};

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { logout } = useAuth()!;
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const handleLogout = () => logout();
  const { token } = useAuth()!;

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (search.trim() === '') {
      setResults([]);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const users = await searchUsersApi(token, search.trim());
        setResults(users);
        setShowResults(true);
      } catch (err) {
        console.error('Search failed', err);
        setResults([]);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [search]);

  const handleSelectUser = (user: any) => {
    flushSync(() => {
      setSearch('');
      setResults([]);
      setShowResults(false);
    });

    navigate(`/profile/${user.id}`);
  };

  return (
    <AppBar position="sticky">
      <Toolbar
        sx={{
          px: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <IconButton
          aria-label="Open navigation"
          edge="start"
          onClick={onMenuClick}
          sx={{
            mr: 1,
            display: { xs: 'flex', md: 'none' },
            color: 'text.secondary',
          }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          color="text.primary"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          Save a Furry Friend
        </Typography>

        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            // Below `md` the field is fluid and would sit flush against the
            // wordmark and the action icons. Symmetric, so the field stays
            // centred; back to 0 at `md`, where there is already 52px+.
            mx: { xs: 1, sm: 2, md: 0 },
          }}
        >
          {/*
           * Shrink-wraps the field so the results dropdown's `left: 0` lines up
           * with it. Fluid below `md`; the 420 cap reproduces the desktop size.
           */}
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              flexGrow: 1,
              maxWidth: 420,
              minWidth: 0,
            }}
          >
            <InputBase
              placeholder="Search people"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{
                bgcolor: 'surface.sunken',
                borderRadius: '6px',
                width: '100%',
                padding: '9px 13px',
                fontSize: 14,
              }}
              startAdornment={
                <SearchIcon sx={{ mr: 1, fontSize: 16, color: 'text.muted' }} />
              }
            />

            {showResults && results.length > 0 && (
              <Paper
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '100%',
                  zIndex: 1,
                  maxHeight: 300,
                  overflowY: 'auto',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '6px',
                }}
              >
                <List>
                  {results.map((user) => (
                    <ListItem
                      key={user.id}
                      component="div"
                      onClick={() => handleSelectUser(user)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <ListItemText
                        primary={`${user.first_name} ${user.last_name}`}
                        secondary={user.email}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Button color="inherit" component={Link} to="/my_profile">
            My Profile
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Log out
          </Button>
        </Box>

        {/* Same destinations and handler, at icon size for the phone bar. */}
        <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
          <IconButton
            component={Link}
            to="/my_profile"
            aria-label="My profile"
            sx={{ color: 'text.secondary' }}
          >
            <PersonOutlineIcon />
          </IconButton>
          <IconButton
            onClick={handleLogout}
            aria-label="Log out"
            sx={{ color: 'text.secondary' }}
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
