import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import {
  fetchUsers,
  addUser as addUserApi,
  deleteUser as deleteUserApi,
  updateUser as updateUserApi,
} from '../service/user/userApi';
import EditUserDialog from '../component/user/edit/EditUserDialog';
import AddUserDialog from '../component/user/add/AddUserDialog';
import ConfirmDeleteUserDialog from '../component/user/delete/ConfirmDeleteUserDialog';
import UserList from '../component/user/list/UserList';
import { Button, Container, Stack, Typography } from '@mui/material';
import Toast from '../component/template/Toast';
import LoadingIndicator from '../component/template/LoadingIndicator';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserPage: React.FC = () => {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>(
    'success'
  );

  const { token } = useAuth()!;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

  const [formErrorSummary, setFormErrorSummary] = useState<string[]>([]);

  const handleOpenAddModal = () => {
    setAddModalOpen(true);
    setFormErrorSummary([]);
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
    setFormErrorSummary([]);
  };

  const handleOpenEditDialog = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setFormErrorSummary([]);
    setEditDialogOpen(false);
    setEditingUser(null);
  };

  const handleOpenDeleteModal = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setUserToDelete(null);
    setDeleteModalOpen(false);
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data: User[] = await fetchUsers(token);
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError(
          error instanceof Error ? error.message : 'Something went wrong'
        );
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [token]);

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
      handleCloseAddModal();
    } catch (error: any) {
      setFormErrorSummary(Object.values(error.list));
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUserApi({
        id: userToDelete.id,
        token,
      });

      setUsers((prevUsers) =>
        prevUsers.filter((user) => user.id !== userToDelete.id)
      );

      setToastOpen(true);
      setToastMessage('Delete success.');
      setToastSeverity('success');
    } catch (error) {
      setToastOpen(true);
      setToastMessage('Delete error.');
      setToastSeverity('error');
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      handleCloseDeleteModal();
    }
  };

  if (loading) {
    return <LoadingIndicator message="Please wait..." />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        severity={toastSeverity}
      />

      <AddUserDialog
        isAddModalOpen={isAddModalOpen}
        newUserName={newUserName}
        newUserEmail={newUserEmail}
        newUserPassword={newUserPassword}
        setNewUserName={setNewUserName}
        setNewUserEmail={setNewUserEmail}
        setNewUserPassword={setNewUserPassword}
        handleCloseAddModal={handleCloseAddModal}
        addUser={addUser}
        formErrorSummary={formErrorSummary}
      />

      <Typography variant="h4" gutterBottom>
        User List
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="flex-end"
        mb={3}
      >
        <Button variant="contained" onClick={handleOpenAddModal}>
          Add
        </Button>
      </Stack>

      <UserList
        users={users}
        onEdit={handleOpenEditDialog}
        onDelete={handleOpenDeleteModal}
      />

      <ConfirmDeleteUserDialog
        open={isDeleteModalOpen}
        userName={userToDelete?.name || ''}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      <EditUserDialog
        open={isEditDialogOpen}
        handleCloseEditDialog={handleCloseEditDialog}
        editingUser={editingUser}
        setToastOpen={setToastOpen}
        setToastMessage={setToastMessage}
        setToastSeverity={setToastSeverity}
        setUsers={setUsers}
      />
    </Container>
  );
};

export default UserPage;
