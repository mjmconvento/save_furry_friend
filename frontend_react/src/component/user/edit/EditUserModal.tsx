import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';

interface EditUserDialogProps {
  open: boolean;
  name: string;
  email: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  name,
  email,
  onNameChange,
  onEmailChange,
  onClose,
  onSave,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit User</DialogTitle>
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
