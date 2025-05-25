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
import { addUser as addUserApi } from '../../../service/user/userApi';
import { useAuth } from '../../../AuthContext';
import { User } from '../../../interface/User';

interface AddUserDialogProps {
  open: boolean;
  handleCloseAddDialog: () => void;
  setToastOpen: (value: boolean) => void;
  setToastMessage: (message: string) => void;
  setToastSeverity: (severity: 'success' | 'error') => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  open,
  handleCloseAddDialog,
  setToastOpen,
  setToastMessage,
  setToastSeverity,
  setUsers,
}) => {
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const { token } = useAuth()!;

  const addUser = async () => {
    try {
      const newUser = await addUserApi({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        token,
      });

      setUsers((prevUsers) => [...prevUsers, newUser]);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setToastOpen(true);
      setToastMessage('Add new user success.');
      setToastSeverity('success');
      handleCloseAddDialog();
      setFormErrorSummary([]);
    } catch (error: any) {
      setFormErrorSummary(Object.values(error.list));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseAddDialog}
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
        <PersonAddIcon sx={{ fontSize: 40, color: 'primary.main' }} />
      </Box>

      <DialogTitle sx={{ textAlign: 'center' }}>Add New User</DialogTitle>
      <ErrorList errors={formErrorSummary} />

      <Box mb={2} px={2}>
        <Typography variant="body2" align="center" color="textSecondary">
          Fill in the details below to update a new user.
        </Typography>
      </Box>

      <DialogContent sx={{ px: 2 }}>
        <TextField
          margin="normal"
          label="Name"
          fullWidth
          variant="outlined"
          required
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
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
            handleCloseAddDialog();
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
