import { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  InputBase,
  Autocomplete,
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
import { isAbort } from '../../service/apiClient';
import { User } from '../../interface/User';

type TopbarProps = {
  /** Opens the overlay nav drawer; the button that calls it is hidden at `md`. */
  onMenuClick: () => void;
};

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { logout, token } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const keyword = search.trim();

    if (keyword === '') {
      setResults([]);

      return;
    }

    // One controller per debounce window: the cleanup below aborts the
    // in-flight request as soon as the query changes, so a slow response for
    // an older keystroke can never overwrite a newer result set.
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setResults(await searchUsersApi(token, keyword, controller.signal));
      } catch (error: unknown) {
        if (isAbort(error)) return;

        console.error('Search failed', error);
        setResults([]);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // `token` belongs here: without it the closure keeps the token of whoever
    // was signed in when this component mounted.
  }, [search, token]);

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
           * Shrink-wraps the field, which is also the popper's anchor: the
           * results list takes its width from it. Fluid below `md`; the 420 cap
           * reproduces the desktop size.
           */}
          <Box
            sx={{
              display: 'flex',
              flexGrow: 1,
              maxWidth: 420,
              minWidth: 0,
            }}
          >
            <Autocomplete<User>
              fullWidth
              // The server already matched the keyword; filtering again here
              // would drop rows it deliberately returned.
              filterOptions={(options) => options}
              options={results}
              getOptionLabel={(user) => `${user.first_name} ${user.last_name}`}
              getOptionKey={(user) => user.id}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              // Nothing is ever "selected": picking a result navigates away, so
              // the field must not keep the chosen name in it.
              value={null}
              inputValue={search}
              onInputChange={(_, value, reason) =>
                setSearch(reason === 'input' ? value : '')
              }
              onChange={(_, user) => {
                if (user) navigate(`/profile/${user.id}`);
              }}
              blurOnSelect
              // Gated on results so an empty debounce window shows no popup, as
              // before. Open/close is otherwise MUI's: it closes on select, on
              // Escape and on click-away, which the hand-rolled list never did.
              open={open && results.length > 0}
              onOpen={() => setOpen(true)}
              onClose={() => setOpen(false)}
              renderInput={(params) => (
                <InputBase
                  id={params.id}
                  disabled={params.disabled}
                  fullWidth={params.fullWidth}
                  ref={params.InputProps.ref}
                  className={params.InputProps.className}
                  onMouseDown={params.InputProps.onMouseDown}
                  inputProps={params.inputProps}
                  placeholder="Search people"
                  sx={{
                    bgcolor: 'surface.sunken',
                    borderRadius: '6px',
                    width: '100%',
                    padding: '9px 13px',
                    fontSize: 14,
                  }}
                  startAdornment={
                    <SearchIcon
                      sx={{ mr: 1, fontSize: 16, color: 'text.muted' }}
                    />
                  }
                />
              )}
              renderOption={({ key, ...optionProps }, user) => (
                <Box component="li" key={key} {...optionProps}>
                  <ListItemText
                    primary={`${user.first_name} ${user.last_name}`}
                    secondary={user.email}
                  />
                </Box>
              )}
              slotProps={{
                paper: {
                  sx: {
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '6px',
                  },
                },
                listbox: { sx: { maxHeight: 300 } },
              }}
            />
          </Box>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Button color="inherit" component={Link} to="/my_profile">
            My Profile
          </Button>
          <Button color="inherit" onClick={logout}>
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
            onClick={logout}
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
