import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import {
  fetchUsers,
  addUser as addUserApi,
  deleteUser as deleteUserApi,
  updateUser as updateUserApi,
} from '../service/user/userApi';
import EditUserDialog from '../component/user/edit/EditUserModal';
import AddUserDialog from '../component/user/add/AddUserModal';
import UserList from '../component/user/list/UserList';
import { Button, Container, Stack, Typography } from '@mui/material';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserPage: React.FC = () => {
  const { token } = useAuth()!;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [updatedName, setUpdatedName] = useState<string>('');
  const [updatedEmail, setUpdatedEmail] = useState<string>('');
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const handleOpenAddModal = () => setAddModalOpen(true);
  const handleCloseAddModal = () => setAddModalOpen(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setUpdatedName(user.name);
    setUpdatedEmail(user.email);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingUser(null);
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
    if (!newUserName || !newUserEmail) {
      setError('Name and Email are required');
      return;
    }

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
    } catch (error) {
      console.error('Error adding user:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    try {
      const updatedUser = await updateUserApi({
        id: editingUser.id,
        name: updatedName,
        email: updatedEmail,
        token,
      });

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user
        )
      );

      setEditingUser(null);
      setUpdatedName('');
      setUpdatedEmail('');
    } catch (error) {
      console.error('Error updating user:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      await deleteUserApi({
        id: userId,
        token,
      });

      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
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
      />

      <Typography variant="h4" gutterBottom>
        User List
      </Typography>

      <UserList
        users={users}
        onEdit={handleOpenEditModal}
        onDelete={handleDelete}
      />

      <EditUserDialog
        open={isEditModalOpen}
        name={updatedName}
        email={updatedEmail}
        onNameChange={setUpdatedName}
        onEmailChange={setUpdatedEmail}
        onClose={handleCloseEditModal}
        onSave={() => {
          handleUpdate();
          handleCloseEditModal();
        }}
      />
    </Container>
  );
};

export default UserPage;
