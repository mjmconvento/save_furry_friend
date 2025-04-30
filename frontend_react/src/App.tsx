import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import UserList from "./page/user/list/UserList";

const LoginForm = () => {
    const { login } = useAuth() as any;
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2>Login</h2>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
            />
            <button type="submit">Login</button>
        </form>
    );
};

function App() {
    const { isAuthenticated } = useAuth() as any;

    return (
        <div className="App">
            {isAuthenticated ? <UserList /> : <LoginForm />}
        </div>
    );
}

const MainApp = () => (
    <AuthProvider>
        <App />
    </AuthProvider>
);

export default MainApp;