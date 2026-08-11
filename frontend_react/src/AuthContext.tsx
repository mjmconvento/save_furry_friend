import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { API_BASE_URL } from './config/api';
import { apiRequest } from './service/apiClient';
import { setUnauthorizedHandler } from './service/authBridge';

export interface CurrentUser {
  id: string;
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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

  // Re-entrancy guard: the revoke call below carries the very token that may
  // already be dead, and a 401 answer reaches `logout` again through the
  // unauthorized bridge. Without this, logout calls itself forever.
  const loggingOut = useRef(false);

  const logout = useCallback(async () => {
    if (loggingOut.current) {
      return;
    }
    loggingOut.current = true;

    try {
      if (token !== null) {
        await apiRequest<unknown>('api/logout', { method: 'POST', token });
      }
    } catch {
      // The token is discarded locally either way; a failed revoke must never
      // leave the user stuck inside a session they asked to end.
    } finally {
      setToken(null);
      setCurrentUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem(USER_ID_KEY);
      localStorage.removeItem(USER_NAME_KEY);
      setIsAuthenticated(false);
      loggingOut.current = false;
    }
  }, [token]);

  // `apiRequest` runs outside React and cannot call `useAuth`, so it reports a
  // 401 through a module-level handler instead. Registering `logout` here is
  // what turns an expired or revoked token into a return to the login form.
  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  // The login response is the only source of the user's identity - there is no
  // "current user" endpoint. A session carrying a token but no cached identity
  // therefore cannot attribute anything the user creates, so send it back
  // through login.
  useEffect(() => {
    if (isAuthenticated && !currentUser) {
      logout();
    }
  }, [isAuthenticated, currentUser, logout]);

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
