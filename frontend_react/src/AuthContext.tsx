import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReactNode } from 'react';
import { API_BASE_URL } from './config/api';
import { User } from './interface/User';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  token: string | null;
  // loggedInUser: User | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const storedToken = localStorage.getItem('token');
    return storedToken !== null;
  });

  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );

  // const [loggedInUser, setLoggedInUser] = useState<User | null>(() => {
  //   const storedLoggedInUser = localStorage.getItem('loggedInUser');

  //   return storedLoggedInUser ? JSON.parse(storedLoggedInUser) : null;
  // });

  const login = async (email: string, password: string) => {
    const loginBody = { email, password };
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(loginBody),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    setToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('loggedInUserId', data.user.id);

    setIsAuthenticated(true);
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  useEffect(() => {}, []);

  return (
    <AuthContext.Provider
      // value={{ isAuthenticated, login, logout, token, loggedInUser }}
      value={{ isAuthenticated, login, logout, token }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
