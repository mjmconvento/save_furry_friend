import React, { useState } from 'react';
import { useAuth } from '../../AuthContext';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link as MuiLink,
  TextField,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

/**
 * The front door wears the same design as the house behind it. This screen
 * used to be the one off-system surface in the app: a hardcoded #f0f2f5
 * background and an elevated card in a flat, warm-paper world - and a fixed
 * 400px width that overflowed a 390px phone.
 */
const LoginForm = () => {
  const { login } = useAuth()!;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // The API's own message is a generic 401; name the problem AND the
      // recovery instead of the dead-end "Login failed".
      setError(
        "That email and password don't match. Check for typos and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Card variant="outlined" sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Sign in to the stories you follow.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <Button
              variant="contained"
              color="primary"
              type="submit"
              fullWidth
              loading={submitting}
              sx={{ mt: 2 }}
            >
              Login
            </Button>
          </form>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <MuiLink
              component={RouterLink}
              to="/forgot-password"
              color="primary"
            >
              Forgot your password?
            </MuiLink>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            New here?{' '}
            <MuiLink component={RouterLink} to="/register" color="primary">
              Create an account
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginForm;
