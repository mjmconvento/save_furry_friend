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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ErrorList from '../../template/ErrorList';

interface AddUserDialogProps {
  isAddModalOpen: boolean;
  newUserName: string;
  newUserEmail: string;
  newUserPassword: string;
  setNewUserName: (value: string) => void;
  setNewUserEmail: (value: string) => void;
  setNewUserPassword: (value: string) => void;
  handleCloseAddModal: () => void;
  addUser: () => void;
  formErrorSummary: string[];
}

const AddUserDialog: React.FC<AddUserDialogProps> = ({
  isAddModalOpen,
  newUserName,
  newUserEmail,
  newUserPassword,
  setNewUserName,
  setNewUserEmail,
  setNewUserPassword,
  handleCloseAddModal,
  addUser,
  formErrorSummary,
}) => {
  return (
    <Dialog
      open={isAddModalOpen}
      onClose={handleCloseAddModal}
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
          onClick={handleCloseAddModal}
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
