import React from 'react';
import { useAuth } from './AuthContext';
import UserList from './component/user/list/UserList';
import LoginForm from './component/login/LoginForm';

const App = () => {
    const { isAuthenticated } = useAuth()!;

    return (
        <div className="App">
            {isAuthenticated ? <UserList /> : <LoginForm />}
        </div>
    );
};

export default App;