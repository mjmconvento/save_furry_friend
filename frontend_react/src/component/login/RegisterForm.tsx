import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { errorSummary } from '../../service/apiClient';
import ErrorList from '../template/ErrorList';

/**
 * Public sign-up. Registration signs the new account straight in, so there is no
 * "now go and log in" step; the address stays unverified until the emailed link
 * is opened, which the banner in the app shell explains.
 */
const RegisterForm = () => {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors([]);
    setSubmitting(true);

    try {
      await register({
        firstName,
        lastName,
        email,
        password,
        passwordConfirmation,
      });
    } catch (error) {
      // `errorSummary` unpacks a 422's per-field bag, so "the password does not
      // match" arrives as itself rather than as "Request failed".
      setErrors(errorSummary(error));
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
      py={4}
    >
      <Card sx={{ width: 420, p: 1 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Create an account
          </Typography>
          <Typography variant="body2" color="text.muted" sx={{ mb: 2 }}>
            For anyone who feeds, traps, treats or rehomes the animals nobody is
            looking for.
          </Typography>

          <ErrorList errors={errors} />

          <form onSubmit={handleSubmit}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                fullWidth
                required
                margin="normal"
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                fullWidth
                required
                margin="normal"
              />
            </Stack>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <TextField
              label="Confirm password"
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              fullWidth
              required
              margin="normal"
            />
            <Button
              variant="contained"
              type="submit"
              loading={submitting}
              fullWidth
              sx={{ mt: 2 }}
            >
              Create account
            </Button>
          </form>

          <Alert severity="info" sx={{ mt: 2 }}>
            We will email a link to confirm your address. Nothing is locked
            until you do.
          </Alert>

          <Typography variant="body2" sx={{ mt: 2 }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterForm;
