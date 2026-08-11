import React, { createContext, useContext, useState, useEffect } from 'react';
import { ReactNode } from 'react';
import { API_BASE_URL } from './config/api';

export interface CurrentUser {
  id: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  token: string | null;
  /** Author identity for anything the user creates. Null only mid-logout. */
  currentUser: CurrentUser | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_ID_KEY = 'loggedInUserId';
const USER_NAME_KEY = 'loggedInUserName';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const storedToken = localStorage.getItem('token');
    return storedToken !== null;
  });

  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const id = localStorage.getItem(USER_ID_KEY);
    const name = localStorage.getItem(USER_NAME_KEY);
    return id && name ? { id, name } : null;
  });

  const login = async (email: string, password: string) => {
    const loginBody = { email, password };
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(loginBody),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    const name = [data.user.first_name, data.user.last_name]
      .filter(Boolean)
      .join(' ');

    setToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem(USER_ID_KEY, data.user.id);
    localStorage.setItem(USER_NAME_KEY, name);

    setCurrentUser({ id: data.user.id, name });
    setIsAuthenticated(true);
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    setIsAuthenticated(false);
  };

  // The login response is the only source of the user's identity - there is no
  // "current user" endpoint (`/api/token/user` returns a token, not a user). A
  // session carrying a token but no cached identity therefore predates this and
  // cannot author a post correctly, so send it back through login. Mirrors how
  // App.tsx handles a missing CSRF cookie.
  useEffect(() => {
    if (isAuthenticated && !currentUser) {
      logout();
    }
  }, [isAuthenticated, currentUser]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, token, currentUser }}
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
