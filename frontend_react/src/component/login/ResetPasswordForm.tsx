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
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../service/auth/authApi';
import { errorSummary } from '../../service/apiClient';
import ErrorList from '../template/ErrorList';

/**
 * Step two of a reset, reached from the emailed link.
 *
 * `token` and `email` come from the query because the broker verifies the one
 * against the other, and this screen cannot know which account a bare token
 * belongs to. Neither is editable: they are the link's authority, not the
 * person's input.
 *
 * It does NOT sign the account in on success. A reset revokes every existing
 * token server-side, so the honest next step is a fresh sign-in with the new
 * password - which also proves the new password works while the person is
 * still paying attention.
 */
const ResetPasswordForm: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);

    try {
      const { message } = await resetPassword({
        token,
        email,
        password,
        passwordConfirmation: confirmation,
      });

      setDone(message);
    } catch (error) {
      setErrors(errorSummary(error));
    } finally {
      setSubmitting(false);
    }
  };

  // A link with no token is not a form to fill in; say what went wrong and
  // offer the one action that helps.
  const linkIsUsable = token !== '' && email !== '';

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
            Set a new password
          </Typography>

          {!linkIsUsable && (
            <Alert severity="error" sx={{ mt: 1 }}>
              This link is missing its reset code. Ask for a new one.
            </Alert>
          )}

          {linkIsUsable && done === null && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                For {email}. Signing in again afterwards keeps every other
                device signed out.
              </Typography>

              <ErrorList errors={errors} />

              <form onSubmit={handleSubmit}>
                <TextField
                  label="New password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                />
                <TextField
                  label="Confirm new password"
                  type="password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  fullWidth
                  required
                  margin="normal"
                />
                <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  loading={submitting}
                  disabled={password === '' || confirmation === ''}
                  sx={{ mt: 2 }}
                >
                  Reset password
                </Button>
              </form>
            </>
          )}

          {done !== null && (
            <Alert severity="success" sx={{ mt: 1 }}>
              {done}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mt: 2 }}>
            <MuiLink component={RouterLink} to="/login" color="primary">
              Sign in
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResetPasswordForm;
