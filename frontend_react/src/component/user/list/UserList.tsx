import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../AuthContext';
import EditForm from '../edit/EditForm'
import {     
    fetchUsers,
    addUser as addUserApi,
    deleteUser as deleteUserApi,
    updateUser as updateUserApi
} from '../../../service/user/userApi';

interface User {
    id: number;
    name: string;
    email: string;
}

const UserList: React.FC = () => {
    const { token, logout } = useAuth()!;
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [updatedName, setUpdatedName] = useState<string>('');
    const [updatedEmail, setUpdatedEmail] = useState<string>('');
    const [newUserName, setNewUserName] = useState<string>('');
    const [newUserEmail, setNewUserEmail] = useState<string>('');
    const [newUserPassword, setNewUserPassword] = useState<string>('');

    const handleLogout = () => {
        logout();
    };

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const data: User[] = await fetchUsers(token);
                setUsers(data);
            } catch (error) {
                console.error("Error fetching users:", error);
                setError(error instanceof Error ? error.message : 'Something went wrong');
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
            console.error("Error adding user:", error);
            setError(error instanceof Error ? error.message : 'Something went wrong');
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setUpdatedName(user.name);
        setUpdatedEmail(user.email);
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
                prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
            );
    
            setEditingUser(null);
            setUpdatedName('');
            setUpdatedEmail('');
        } catch (error) {
            console.error("Error updating user:", error);
            setError(error instanceof Error ? error.message : 'Something went wrong');
        }
    };

    const handleDelete = async (userId: number) => {
        try {
            await deleteUserApi({
                id: userId,
                token,
            });
    
            setUsers((prevUsers) => prevUsers.filter(user => user.id !== userId));
        } catch (error) {
            console.error("Error deleting user:", error);
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
        <div>
            <button onClick={handleLogout}>Logout</button>

            <h2>User List</h2>
            <ul>
                {users.map((user) => (
                    <li key={user.id}>
                        <strong>{user.id}</strong> ({user.name}) - {user.email} 
                        <button onClick={() => handleEdit(user)}>Edit</button>
                        <button onClick={() => handleDelete(user.id)}>Delete</button>
                    </li>
                ))}
            </ul>

            <h3>Add New User</h3>
            <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Name"
            />
            <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Email"
            />
            <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Password"
            />
            <button onClick={addUser}>Add User</button>

            {editingUser && (
                <EditForm
                    name={updatedName}
                    email={updatedEmail}
                    onNameChange={(e) => setUpdatedName(e.target.value)}
                    onEmailChange={(e) => setUpdatedEmail(e.target.value)}
                    onUpdate={handleUpdate}
                    onCancel={() => setEditingUser(null)}
                />
            )}
        </div>
    );
};

export default UserList;