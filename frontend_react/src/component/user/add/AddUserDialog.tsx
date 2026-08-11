import React, { useState } from 'react';
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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ErrorList from '../../template/ErrorList';
import { useNotify } from '../../template/ToastProvider';
import { addUser as addUserApi } from '../../../service/user/userApi';
import { errorSummary } from '../../../service/apiClient';
import { useAuth } from '../../../AuthContext';
import { User } from '../../../interface/User';

interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (user: User) => void;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  open,
  onClose,
  onSaved,
}) => {
  const [newUserFirstName, setNewUserFirstName] = useState<string>('');
  const [newUserMiddleName, setNewUserMiddleName] = useState<string>('');
  const [newUserLastName, setNewUserLastName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const { token } = useAuth();
  const notify = useNotify();

  const addUser = async () => {
    try {
      const newUser = await addUserApi({
        firstName: newUserFirstName,
        middleName: newUserMiddleName,
        lastName: newUserLastName,
        email: newUserEmail,
        password: newUserPassword,
        token: token,
      });

      onSaved(newUser);
      setNewUserFirstName('');
      setNewUserMiddleName('');
      setNewUserLastName('');
      setNewUserEmail('');
      setNewUserPassword('');
      notify({ message: 'Add new user success.', severity: 'success' });
      onClose();
      setFormErrorSummary([]);
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
      aria-labelledby="add-user-title"
      sx={{
        '& .MuiPaper-root': {
          borderRadius: 12,
          padding: 8,
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
        },
      }}
    >
      <Box display="flex" justifyContent="center" mb={1}>
        <PersonAddIcon sx={{ fontSize: 40, color: 'primary.main' }} />
      </Box>

      <DialogTitle id="add-user-title" sx={{ textAlign: 'center' }}>
        Add New User
      </DialogTitle>
      <ErrorList errors={formErrorSummary} />

      <Box mb={2} px={2}>
        <Typography variant="body2" align="center" color="textSecondary">
          Fill in the details below to update a new user.
        </Typography>
      </Box>

      <DialogContent sx={{ px: 2 }}>
        <TextField
          margin="normal"
          label="First Name"
          fullWidth
          variant="outlined"
          required
          value={newUserFirstName}
          onChange={(e) => setNewUserFirstName(e.target.value)}
        />
        <TextField
          margin="normal"
          label="Middle Name"
          fullWidth
          variant="outlined"
          required
          value={newUserMiddleName}
          onChange={(e) => setNewUserMiddleName(e.target.value)}
        />
        <TextField
          margin="normal"
          label="Last Name"
          fullWidth
          variant="outlined"
          required
          value={newUserLastName}
          onChange={(e) => setNewUserLastName(e.target.value)}
        />
        <TextField
          margin="normal"
          label="Email"
          type="email"
          fullWidth
          required
          variant="outlined"
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
        />
        <TextField
          margin="normal"
          label="Password"
          type="password"
          fullWidth
          required
          variant="outlined"
          value={newUserPassword}
          onChange={(e) => setNewUserPassword(e.target.value)}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        <Button
          onClick={() => {
            onClose();
            setFormErrorSummary([]);
          }}
          variant="outlined"
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => {
            addUser();
          }}
          variant="contained"
          color="primary"
          sx={{ textTransform: 'none' }}
        >
          Add User
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserDialog;
