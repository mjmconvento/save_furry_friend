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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { searchUsers as searchUsersApi } from '../../service/user/userApi';
import { flushSync } from 'react-dom';

const Topbar = () => {
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
    <AppBar position="sticky" sx={{ backgroundColor: '#1976d2' }}>
      <Toolbar
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">Save A Furry Friend</Typography>

        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <InputBase
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              backgroundColor: 'white',
              padding: '6px 12px',
              borderRadius: 2,
              width: 400,
              boxShadow: 1,
            }}
            startAdornment={<SearchIcon sx={{ mr: 1 }} />}
          />

          {showResults && results.length > 0 && (
            <Paper
              sx={{
                position: 'absolute',
                top: '100%',
                left: '10%',
                width: '80%',
                zIndex: 0,
                maxHeight: 300,
                overflowY: 'auto',
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

        <Box>
          <Button color="inherit" component={Link} to="/my_profile">
            My Profile
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
