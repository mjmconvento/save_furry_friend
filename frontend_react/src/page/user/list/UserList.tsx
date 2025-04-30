import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../AuthContext';

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

    // State for adding a new user
    const [newUserName, setNewUserName] = useState<string>('');
    const [newUserEmail, setNewUserEmail] = useState<string>('');
    const [newUserPassword, setNewUserPassword] = useState<string>('');

    const handleLogout = () => {
        logout(); // Call logout function from context
    };

    useEffect(() => {
        const storedToken = localStorage.getItem('token');

        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:8081/api/users', {
                    method: 'GET', // Default is GET, but you can specify it
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${storedToken}`, // Include the token here
                    },
                });
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data: User[] = await response.json();
                setUsers(data);
            } catch (error) {
                console.error("Error fetching users:", error);
                setError(error instanceof Error ? error.message : 'Something went wrong');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const addUser = async () => {
        if (!newUserName || !newUserEmail) {
            setError('Name and Email are required');
            return;
        }

        try {
            const loginBody = {
                "email": "test@gmail.com",
                "password": "jobpogi123", // Replace with appropriate login credentials
            };
            
            const loginResponse = await fetch(`http://localhost:8081/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginBody),
            });

            const loginData = await loginResponse.json();
            const response = await fetch('http://localhost:8081/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ` + loginData.token,
                },
                body: JSON.stringify({ 
                    name: newUserName,
                    email: newUserEmail,
                    password: newUserPassword 
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add user');
            }

            const newUser: User = await response.json(); // Assuming the response contains the newly created user
            setUsers((prevUsers) => [...prevUsers, newUser]); // Update user list with the new user

            // Clear the input fields
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

        const updatedUser = {
            ...editingUser,
            name: updatedName,
            email: updatedEmail,
        };

        try {
            const loginBody = {
                "email": "test@gmail.com",
                "password": "jobpogi123",
            }

            const loginResponse = await fetch(`http://localhost:8081/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginBody),
            });

            const data = await loginResponse.json();

            const response = await fetch(`http://localhost:8081/api/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ` + data.token,
                },
                body: JSON.stringify(updatedUser),
                
            });

            if (!response.ok) {
                throw new Error('Failed to update user');
            }

            // Update the users state with the modified user
            setUsers((prevUsers) =>
                prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
            );

            // Clear editing state after successful update
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
            const loginBody = {
                "email": "test@gmail.com",
                "password": "jobpogi123",
            };

            const loginResponse = await fetch(`http://localhost:8081/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginBody),
            });

            const data = await loginResponse.json();

            const response = await fetch(`http://localhost:8081/api/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ` + data.token,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            // Update the users state to remove the deleted user
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
            <button onClick={handleLogout}>Logout</button> {/* Logout button */}
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
                <div>
                    <h3>Edit User</h3>
                    <input
                        type="text"
                        value={updatedName}
                        onChange={(e) => setUpdatedName(e.target.value)}
                        placeholder="Name"
                    />
                    <input
                        type="email"
                        value={updatedEmail}
                        onChange={(e) => setUpdatedEmail(e.target.value)}
                        placeholder="Email"
                    />

                    <button onClick={handleUpdate}>Update</button>
                    <button onClick={() => setEditingUser(null)}>Cancel</button>
                </div>
            )}
        </div>
    );
};

export default UserList;