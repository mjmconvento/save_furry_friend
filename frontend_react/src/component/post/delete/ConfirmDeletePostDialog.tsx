import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import { deletePost as deletePostApi } from '../../../service/post/postApi';
import { errorSummary } from '../../../service/apiClient';
import { useNotify } from '../../template/ToastProvider';
import { useAuth } from '../../../AuthContext';
import { Post } from '../../../interface/Post';

interface ConfirmDeletePostDialogProps {
  open: boolean;
  post: Post | null;
  onClose: () => void;
  onDeleted: (id: string) => void;
}

const ConfirmDeletePostDialog: React.FC<ConfirmDeletePostDialogProps> = ({
  open,
  post,
  onClose,
  onDeleted,
}) => {
  const { token } = useAuth();
  const notify = useNotify();

  const handleConfirmDelete = async () => {
    if (!post) return;

    try {
      await deletePostApi({ id: post.id, token: token });

      onDeleted(post.id);
      notify({ message: 'Delete success.', severity: 'success' });
    } catch (error: unknown) {
      // The generic 'Delete error.' this used to show discarded the only
      // explanation the server gave (permission, missing record, validation).
      notify({ message: errorSummary(error).join(' '), severity: 'error' });
    } finally {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      aria-labelledby="delete-post-title"
      sx={{
        '& .MuiPaper-root': {
          borderRadius: 12,
          padding: 5,
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        },
      }}
    >
      <DialogTitle
        id="delete-post-title"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          color: 'error.main',
        }}
      >
        <WarningIcon fontSize="large" />
        <Typography variant="h6">Are you sure?</Typography>
      </DialogTitle>
      <DialogContent>
        <Box
          display="flex"
          alignItems="center"
          flexDirection="column"
          sx={{ px: 2, py: 1 }}
        >
          <Typography variant="body1" align="center" gutterBottom>
            You're about to delete this post.
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            This action cannot be undone.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirmDelete}
          variant="contained"
          color="error"
          sx={{ textTransform: 'none' }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDeletePostDialog;
