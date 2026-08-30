import React, { useState } from 'react';
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
import { requestPasswordReset } from '../../service/auth/authApi';
import { errorSummary } from '../../service/apiClient';
import ErrorList from '../template/ErrorList';

/**
 * Step one of a reset. Sibling of `LoginForm`, and deliberately identical in
 * shape: this is the screen someone reaches on their worst day with the
 * product, so it is not the place for a different layout.
 *
 * The confirmation is the API's own uniform sentence, kept verbatim. Saying
 * "we sent you a link" would claim more than the API is willing to confirm,
 * because confirming it would let anyone test whether an address has an account.
 */
const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    try {
      const { message } = await requestPasswordReset(email);

      setSent(message);
    } catch (error) {
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
      px={2}
    >
      <Card variant="outlined" sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Reset your password
          </Typography>

          {sent === null ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Tell us the address you signed up with and we will send a link
                to set a new password.
              </Typography>

              <ErrorList errors={errors} />

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
                <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  loading={submitting}
                  disabled={email.trim() === ''}
                  sx={{ mt: 2 }}
                >
                  Send reset link
                </Button>
              </form>
            </>
          ) : (
            <Alert severity="success" sx={{ mt: 1 }}>
              {sent}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mt: 2 }}>
            <MuiLink component={RouterLink} to="/login" color="primary">
              Back to sign in
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPasswordForm;
