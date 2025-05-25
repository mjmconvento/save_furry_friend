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
import { deleteUser as deleteUserApi } from '../../../service/user/userApi';
import { useAuth } from '../../../AuthContext';
import { User } from '../../../interface/User';

interface ConfirmDeleteUserDialogProps {
  open: boolean;
  userToDelete: User | null;
  userName: string;
  setToastOpen: (value: boolean) => void;
  setToastMessage: (message: string) => void;
  setToastSeverity: (severity: 'success' | 'error') => void;
  handleCloseDeleteDialog: () => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const ConfirmDeleteUserDialog: React.FC<ConfirmDeleteUserDialogProps> = ({
  open,
  userToDelete,
  userName,
  handleCloseDeleteDialog,
  setToastOpen,
  setToastMessage,
  setToastSeverity,
  setUsers,
}) => {
  const { token } = useAuth()!;

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserApi({
        id: userToDelete.id,
        token,
      });

      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.id !== userToDelete.id)
      );

      setToastOpen(true);
      setToastMessage('Delete success.');
      setToastSeverity('success');
    } catch (error) {
      setToastOpen(true);
      setToastMessage('Delete error.');
      setToastSeverity('error');
    } finally {
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
            You're about to delete <strong>{userName}</strong>.
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

export default ConfirmDeleteUserDialog;
