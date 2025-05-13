import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from '@mui/material';
import ErrorList from '../../template/ErrorList';
import EditIcon from '@mui/icons-material/Edit';

interface EditUserDialogProps {
  open: boolean;
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  formErrorSummary: string[];
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  name,
  email,
  onNameChange,
  onEmailChange,
  onClose,
  onSave,
  formErrorSummary,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
        },
      }}
    >
      <Box display="flex" justifyContent="center" mb={1}>
        <EditIcon sx={{ fontSize: 40, color: 'primary.main' }} />
      </Box>

      <DialogTitle sx={{ textAlign: 'center' }}>Edit User</DialogTitle>
      <ErrorList errors={formErrorSummary} />

      <Box mb={2} px={2}>
        <Typography variant="body2" align="center" color="textSecondary">
          Fill in the details below to add a new user.
        </Typography>
      </Box>

      <DialogContent>
        <TextField
          margin="normal"
          label="Name"
          fullWidth
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <TextField
          margin="normal"
          label="Email"
          fullWidth
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={onSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
