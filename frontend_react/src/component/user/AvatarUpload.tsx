import React, { useRef, useState } from 'react';
import { Button, Stack } from '@mui/material';
import { useAuth } from '../../AuthContext';
import { errorSummary } from '../../service/apiClient';
import { useNotify } from '../template/ToastProvider';

/** Matches `StoreAvatarRequest`, so an obvious reject never reaches the API. */
const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Picture controls for your own profile. A hidden file input behind a button,
 * because a styled `<input type="file">` is not worth the fight.
 */
const AvatarUpload: React.FC = () => {
  const { currentUser, changeAvatar } = useAuth();
  const notify = useNotify();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const run = async (file: File | null) => {
    setBusy(true);

    try {
      await changeAvatar(file);
      notify({
        message: file === null ? 'Picture removed.' : 'Picture updated.',
        severity: 'success',
      });
    } catch (error) {
      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    // Let the same file be chosen again after a failure: without this the input
    // holds the old value and `change` never fires a second time.
    event.target.value = '';

    if (file === null) {
      return;
    }

    if (file.size > MAX_BYTES) {
      notify({
        message: 'A profile picture must be 4 MB or smaller.',
        severity: 'error',
      });

      return;
    }

    run(file);
  };

  return (
    <Stack direction="row" spacing={1}>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        onChange={onPicked}
        hidden
        data-testid="avatar-input"
      />
      <Button
        variant="outlined"
        loading={busy}
        onClick={() => input.current?.click()}
      >
        {currentUser?.avatar === null ? 'Add picture' : 'Change picture'}
      </Button>
      {currentUser?.avatar !== null && (
        <Button color="inherit" loading={busy} onClick={() => run(null)}>
          Remove
        </Button>
      )}
    </Stack>
  );
};

export default AvatarUpload;
