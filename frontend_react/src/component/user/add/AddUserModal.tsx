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
  isAddModalOpen: boolean;
  newUserName: string;
  newUserEmail: string;
  newUserPassword: string;
  setNewUserName: (value: string) => void;
  setNewUserEmail: (value: string) => void;
  setNewUserPassword: (value: string) => void;
  handleCloseAddModal: () => void;
  addUser: () => void;
}

const AddUserDialog: React.FC<EditUserDialogProps> = ({
  isAddModalOpen,
  newUserName,
  newUserEmail,
  newUserPassword,
  setNewUserName,
  setNewUserEmail,
  setNewUserPassword,
  handleCloseAddModal,
  addUser,
}) => {
  return (
    <Dialog open={isAddModalOpen} onClose={handleCloseAddModal}>
      <DialogTitle>Add New User</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Name"
          fullWidth
          value={newUserName}
          onChange={(e) => setNewUserName(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Email"
          type="email"
          fullWidth
          value={newUserEmail}
          onChange={(e) => setNewUserEmail(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Password"
          type="password"
          fullWidth
          value={newUserPassword}
          onChange={(e) => setNewUserPassword(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseAddModal}>Cancel</Button>
        <Button
          onClick={() => {
            addUser();
            handleCloseAddModal();
          }}
          variant="contained"
        >
          Add User
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUserDialog;
