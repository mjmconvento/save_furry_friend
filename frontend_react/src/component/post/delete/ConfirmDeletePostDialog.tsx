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
import { useAuth } from '../../../AuthContext';
import { Post } from '../../../interface/Post';

interface ConfirmDeletePostDialogProps {
  open: boolean;
  postToDelete: Post | null;
  setToastOpen: (value: boolean) => void;
  setToastMessage: (message: string) => void;
  setToastSeverity: (severity: 'success' | 'error') => void;
  setLoading: (value: boolean) => void;
  handleCloseDeleteDialog: () => void;
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
}

const ConfirmDeletePostDialog: React.FC<ConfirmDeletePostDialogProps> = ({
  open,
  postToDelete,
  handleCloseDeleteDialog,
  setLoading,
  setToastOpen,
  setToastMessage,
  setToastSeverity,
  setPosts,
}) => {
  const { token } = useAuth()!;

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    setLoading(true);

    try {
      await deletePostApi({
        id: postToDelete.id,
        token: token,
      });

      setPosts((prevPosts) =>
        prevPosts.filter((post) => post.id !== postToDelete.id)
      );

      setToastOpen(true);
      setToastMessage('Delete success.');
      setToastSeverity('success');
    } catch (error) {
      setToastOpen(true);
      setToastMessage('Delete error.');
      setToastSeverity('error');
    } finally {
      setLoading(false);
      handleCloseDeleteDialog();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseDeleteDialog}
      maxWidth="xs"
      sx={{
        '& .MuiPaper-root': {
          borderRadius: 12,
          padding: 5,
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        },
      }}
    >
      <DialogTitle
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
          onClick={handleCloseDeleteDialog}
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
