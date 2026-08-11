import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import ErrorList from '../../template/ErrorList';
import { useNotify } from '../../template/ToastProvider';
import EditIcon from '@mui/icons-material/Edit';
import { useAuth } from '../../../AuthContext';
import { updateUser as updateUserApi } from '../../../service/user/userApi';
import { errorSummary } from '../../../service/apiClient';
import { User } from '../../../interface/User';

interface EditUserDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSaved: (user: User) => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  user,
  onClose,
  onSaved,
}) => {
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const [updatedFirstName, setUpdatedFirstName] = useState<string>('');
  const [updatedMiddleName, setUpdatedMiddleName] = useState<string>('');
  const [updatedLastName, setUpdatedLastName] = useState<string>('');
  const [updatedEmail, setUpdatedEmail] = useState<string>('');
  const { token } = useAuth();
  const notify = useNotify();

  useEffect(() => {
    if (user) {
      setUpdatedFirstName(user.first_name);
      // `middle_name` is nullable on the wire; the field is a controlled input.
      setUpdatedMiddleName(user.middle_name ?? '');
      setUpdatedLastName(user.last_name);
      setUpdatedEmail(user.email);
    }
  }, [user, open]);

  const handleUpdate = async () => {
    if (!user) return;

    try {
      const updatedUser = await updateUserApi({
        id: user.id,
        firstName: updatedFirstName,
        middleName: updatedMiddleName,
        lastName: updatedLastName,
        email: updatedEmail,
        token: token,
      });

      onSaved(updatedUser);

      setFormErrorSummary([]);
      setUpdatedFirstName('');
      setUpdatedMiddleName('');
      setUpdatedLastName('');
      setUpdatedEmail('');

      notify({ message: 'Update success.', severity: 'success' });
      onClose();
    } catch (error: unknown) {
      setFormErrorSummary(errorSummary(error));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="edit-user-title"
      sx={{
        '& .MuiPaper-root': {
          borderRadius: 12,
          padding: 5,
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        },
      }}
    >
      <Box display="flex" justifyContent="center" mb={1}>
        <EditIcon sx={{ fontSize: 40, color: 'primary.main' }} />
      </Box>

      <DialogTitle id="edit-user-title" sx={{ textAlign: 'center' }}>
        Edit User
      </DialogTitle>
      <ErrorList errors={formErrorSummary} />

      <DialogContent>
        <TextField
          margin="normal"
          label="First Name"
          fullWidth
          value={updatedFirstName}
          onChange={(e) => setUpdatedFirstName(e.target.value)}
        />
        <TextField
          margin="normal"
          label="Middle Name"
          fullWidth
          value={updatedMiddleName}
          onChange={(e) => setUpdatedMiddleName(e.target.value)}
        />
        <TextField
          margin="normal"
          label="Last Name"
          fullWidth
          value={updatedLastName}
          onChange={(e) => setUpdatedLastName(e.target.value)}
        />
        <TextField
          margin="normal"
          label="Email"
          fullWidth
          value={updatedEmail}
          onChange={(e) => setUpdatedEmail(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleUpdate}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
