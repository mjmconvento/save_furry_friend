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
import {
  deleteAvatar,
  updatePreference,
  uploadAvatar,
} from './service/user/userApi';
import { setUnauthorizedHandler } from './service/authBridge';
import type {
  UserPreferenceKey,
  UserPreferences,
  UserRole,
} from './interface/User';

export interface CurrentUser {
  id: string;
  name: string;
  roles: UserRole[];
  /** Absolute URL, or null for initials. */
  avatar: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  token: string | null;
  /** Author identity for anything the user creates. Null only mid-logout. */
  currentUser: CurrentUser | null;
  /**
   * Whether to offer administration UI. A convenience so consumers do not each
   * repeat the membership test - and emphatically not a security boundary: this
   * is derived from `localStorage`, which the user can edit. The API's 403 is
   * what actually protects user administration.
   */
  isAdmin: boolean;
  /**
   * Account-level display preferences, cached from the login payload. Absent
   * keys are off, so a session predating a preference behaves as if it were
   * never set rather than being ended.
   */
  preferences: UserPreferences;
  /**
   * Writes one preference to the account and updates the cache. Rejects if the
   * API refused, so a caller can say the setting did not stick.
   */
  setPreference: (key: UserPreferenceKey, value: boolean) => Promise<void>;
  /**
   * Replaces or clears your own picture and refreshes the cached copy, so the
   * topbar and profile update without a reload. Rejects if the API refused.
   */
  changeAvatar: (file: File | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_ID_KEY = 'loggedInUserId';
const USER_NAME_KEY = 'loggedInUserName';
const USER_ROLES_KEY = 'loggedInUserRoles';
const USER_PREFERENCES_KEY = 'loggedInUserPreferences';
const USER_AVATAR_KEY = 'loggedInUserAvatar';

/**
 * Only known keys, and only booleans. Anything else is dropped, which keeps a
 * hand-edited value from turning into a truthy preference.
 */
const toPreferences = (value: unknown): UserPreferences => {
  if (value === null || typeof value !== 'object') {
    return {};
  }

  const source = value as Record<string, unknown>;

  return source.hide_heartbreaking_warning === true
    ? { hide_heartbreaking_warning: true }
    : {};
};

const readStoredPreferences = (raw: string | null): UserPreferences => {
  if (raw === null) {
    return {};
  }

  try {
    return toPreferences(JSON.parse(raw));
  } catch {
    // Truncated or hand-edited storage means "no preferences set", not a crash.
    return {};
  }
};

/**
 * Unknown entries are dropped rather than trusted, mirroring the enum cast on
 * the API. A list with nothing recognisable in it counts as missing, which drops
 * `currentUser` to null and sends the session back through login - the same
 * thing that happens to sessions predating this field.
 */
const toRoles = (value: unknown): UserRole[] | null => {
  if (!Array.isArray(value)) {
    return null;
  }

  const roles = value.filter(
    (role): role is UserRole => role === 'admin' || role === 'user'
  );

  return roles.length > 0 ? roles : null;
};

const readStoredRoles = (raw: string | null): UserRole[] | null => {
  if (raw === null) {
    return null;
  }

  try {
    return toRoles(JSON.parse(raw));
  } catch {
    // Hand-edited or truncated storage, which is not a crash.
    return null;
  }
};

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
    const roles = readStoredRoles(localStorage.getItem(USER_ROLES_KEY));
    // A cached avatar is optional: unlike identity, its absence just means
    // initials until the next login refreshes it.
    const avatar = localStorage.getItem(USER_AVATAR_KEY);
    return id && name && roles ? { id, name, roles, avatar } : null;
  });
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    readStoredPreferences(localStorage.getItem(USER_PREFERENCES_KEY))
  );

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
    // The same validator the rehydrate path uses. Failing loudly beats storing
    // nothing recognisable: silently treating it as non-admin would look like a
    // permissions bug, and trusting it would be worse.
    const roles = toRoles(data.user.roles);

    if (roles === null) {
      throw new Error('Login failed: the server sent no recognisable role');
    }

    // Unlike roles, an unreadable preference map is not fatal: everything
    // defaults to off, which is the safe behaviour for a content warning.
    const loginPreferences = toPreferences(data.user.preferences);

    setToken(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem(USER_ID_KEY, data.user.id);
    localStorage.setItem(USER_NAME_KEY, name);
    localStorage.setItem(USER_ROLES_KEY, JSON.stringify(roles));
    localStorage.setItem(
      USER_PREFERENCES_KEY,
      JSON.stringify(loginPreferences)
    );

    const avatar =
      typeof data.user.avatar === 'string' ? data.user.avatar : null;

    if (avatar === null) {
      localStorage.removeItem(USER_AVATAR_KEY);
    } else {
      localStorage.setItem(USER_AVATAR_KEY, avatar);
    }

    setCurrentUser({ id: data.user.id, name, roles, avatar });
    setPreferences(loginPreferences);
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
      setPreferences({});
      localStorage.removeItem('token');
      localStorage.removeItem(USER_ID_KEY);
      localStorage.removeItem(USER_NAME_KEY);
      localStorage.removeItem(USER_ROLES_KEY);
      localStorage.removeItem(USER_PREFERENCES_KEY);
      localStorage.removeItem(USER_AVATAR_KEY);
      setIsAuthenticated(false);
      loggingOut.current = false;
    }
  }, [token]);

  const setPreference = useCallback(
    async (key: UserPreferenceKey, value: boolean): Promise<void> => {
      // The account is the source of truth; this cache only spares every render
      // a round trip. Writing it before the API confirmed would make a failed
      // save look successful until the next login.
      const saved = await updatePreference(token, key, value);

      setPreferences(saved);
      localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(saved));
    },
    [token]
  );

  const changeAvatar = useCallback(
    async (file: File | null): Promise<void> => {
      // `null` means remove. Same rule as preferences: the account answers first,
      // then the cache follows, so a rejected upload leaves nothing to unwind.
      const updated =
        file === null
          ? await deleteAvatar(token)
          : await uploadAvatar(token, file);

      if (updated.avatar === null) {
        localStorage.removeItem(USER_AVATAR_KEY);
      } else {
        localStorage.setItem(USER_AVATAR_KEY, updated.avatar);
      }

      setCurrentUser((previous) =>
        previous === null ? previous : { ...previous, avatar: updated.avatar }
      );
    },
    [token]
  );

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
      value={{
        isAuthenticated,
        login,
        logout,
        token,
        currentUser,
        isAdmin: currentUser?.roles.includes('admin') ?? false,
        preferences,
        setPreference,
        changeAvatar,
      }}
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
