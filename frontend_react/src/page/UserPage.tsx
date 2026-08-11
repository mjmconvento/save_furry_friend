import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { fetchUsers } from '../service/user/userApi';
import EditUserDialog from '../component/user/edit/EditUserDialog';
import AddUserDialog from '../component/user/add/AddUserDialog';
import ConfirmDeleteUserDialog from '../component/user/delete/ConfirmDeleteUserDialog';
import UserList from '../component/user/list/UserList';
import { Button, Container, Stack, Typography } from '@mui/material';
import LoadingIndicator from '../component/template/LoadingIndicator';
import { User } from '../interface/User';

const UserPage: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleOpenAddDialog = () => {
    setAddDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setAddDialogOpen(false);
  };

  const handleOpenEditDialog = (user: User) => {
    setEditingUser(user);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingUser(null);
  };

  const handleOpenDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setUserToDelete(null);
    setDeleteDialogOpen(false);
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

  if (loading) {
    return <LoadingIndicator message="Please wait..." />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 4, pb: 4 }}>
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
        <Button variant="contained" onClick={handleOpenAddDialog}>
          Add
        </Button>
      </Stack>

      <UserList
        users={users}
        onEdit={handleOpenEditDialog}
        onDelete={handleOpenDeleteDialog}
      />

      <AddUserDialog
        open={isAddDialogOpen}
        onClose={handleCloseAddDialog}
        onSaved={(user) => setUsers((prev) => [...prev, user])}
      />

      <EditUserDialog
        open={isEditDialogOpen}
        user={editingUser}
        onClose={handleCloseEditDialog}
        onSaved={(saved) =>
          setUsers((prev) =>
            prev.map((user) => (user.id === saved.id ? saved : user))
          )
        }
      />

      <ConfirmDeleteUserDialog
        open={isDeleteDialogOpen}
        user={userToDelete}
        onClose={handleCloseDeleteDialog}
        onDeleted={(id) =>
          setUsers((prev) => prev.filter((user) => user.id !== id))
        }
      />
    </Container>
  );
};

export default UserPage;
