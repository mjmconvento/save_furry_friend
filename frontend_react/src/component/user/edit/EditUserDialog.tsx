import React, { useEffect, useState } from 'react';
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
import { useAuth } from '../../../AuthContext';
import { updateUser as updateUserApi } from '../../../service/user/userApi';
import { User } from '../../../interface/User';

interface EditUserDialogProps {
  open: boolean;
  editingUser: User | null;
  handleCloseEditDialog: () => void;
  setToastOpen: (value: boolean) => void;
  setToastMessage: (message: string) => void;
  setToastSeverity: (severity: 'success' | 'error') => void;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  editingUser,
  handleCloseEditDialog,
  setToastOpen,
  setToastMessage,
  setToastSeverity,
  setUsers,
}) => {
  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);
  const [updatedFirstName, setUpdatedFirstName] = useState<string>('');
  const [updatedMiddleName, setUpdatedMiddleName] = useState<string>('');
  const [updatedLastName, setUpdatedLastName] = useState<string>('');
  const [updatedEmail, setUpdatedEmail] = useState<string>('');
  const { token } = useAuth()!;

  useEffect(() => {
    if (editingUser) {
      setUpdatedFirstName(editingUser.first_name);
      setUpdatedMiddleName(editingUser.middle_name);
      setUpdatedLastName(editingUser.last_name);
      setUpdatedEmail(editingUser.email);
    }
  }, [editingUser, open]);

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const updatedUser = await updateUserApi({
        id: editingUser.id,
        firstName: updatedFirstName,
        middleName: updatedMiddleName,
        lastName: updatedLastName,
        email: updatedEmail,
        token: token,
      });

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        )
      );

      setFormErrorSummary([]);
      setUpdatedFirstName('');
      setUpdatedMiddleName('');
      setUpdatedLastName('');
      setUpdatedEmail('');

      setToastOpen(true);
      setToastMessage('Update success.');
      setToastSeverity('success');
      handleCloseEditDialog();
    } catch (error: any) {
      setFormErrorSummary(Object.values(error.list));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleCloseEditDialog}
      maxWidth="sm"
      fullWidth
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

      <DialogTitle sx={{ textAlign: 'center' }}>Edit User</DialogTitle>
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
        <Button onClick={handleCloseEditDialog}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleUpdate}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
