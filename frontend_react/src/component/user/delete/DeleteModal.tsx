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

interface ConfirmDeleteModalProps {
  open: boolean;
  userName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  userName,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      PaperProps={{
        style: {
          borderRadius: 12,
          padding: 20,
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
          onClick={onClose}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
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

export default ConfirmDeleteModal;
