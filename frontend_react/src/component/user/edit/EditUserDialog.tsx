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
  const [updatedName, setUpdatedName] = useState<string>('');
  const [updatedEmail, setUpdatedEmail] = useState<string>('');
  const { token } = useAuth()!;

  useEffect(() => {
    if (editingUser) {
      setUpdatedName(editingUser.name);
      setUpdatedEmail(editingUser.email);
    }
  }, [editingUser, open]);

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const updatedUser = await updateUserApi({
        id: editingUser.id,
        name: updatedName,
        email: updatedEmail,
        token: token,
      });

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        )
      );

      setFormErrorSummary([]);
      setUpdatedName('');
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
          label="Name"
          fullWidth
          value={updatedName}
          onChange={(e) => setUpdatedName(e.target.value)}
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
