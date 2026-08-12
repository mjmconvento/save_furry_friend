import React, { useState } from 'react';
import { Alert, Button, Stack } from '@mui/material';
import { useAuth } from '../../AuthContext';
import { resendVerification } from '../../service/auth/authApi';
import { errorSummary } from '../../service/apiClient';
import { useNotify } from './ToastProvider';

/**
 * Shown on every page while the signed-in address is unverified.
 *
 * Nothing is gated on verification yet, so this is informational - which is why
 * it is an `info` alert rather than a warning, and why it never blocks the page.
 *
 * The link is opened outside this tab, so the flag cannot update itself: hence
 * the explicit re-check, which re-reads the account.
 */
const VerifyEmailBanner: React.FC = () => {
  const { currentUser, token, refreshAccount } = useAuth();
  const notify = useNotify();
  const [busy, setBusy] = useState<boolean>(false);

  if (currentUser === null || currentUser.emailVerified) {
    return null;
  }

  const resend = async () => {
    setBusy(true);

    try {
      const { message } = await resendVerification(token);
      notify({ message, severity: 'success' });
    } catch (error) {
      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);

    try {
      await refreshAccount();
      notify({ message: 'Checked.', severity: 'success' });
    } catch (error) {
      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Alert
      severity="info"
      // Sits at the top of the content column rather than spanning the window,
      // so it clears the fixed sidebar. Rounded to match the cards below it.
      sx={{ mb: 3 }}
      action={
        <Stack direction="row" spacing={1}>
          <Button color="inherit" size="small" loading={busy} onClick={resend}>
            Resend link
          </Button>
          <Button color="inherit" size="small" loading={busy} onClick={recheck}>
            I have verified
          </Button>
        </Stack>
      }
    >
      Your email address is not confirmed yet. Open the link we sent to finish.
    </Alert>
  );
};

export default VerifyEmailBanner;
