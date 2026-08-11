import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import LoginForm from '../component/login/LoginForm';

const AFTER_LOGIN_FALLBACK = '/';

/**
 * Where to send the user once they are signed in. History state is untyped and
 * anyone can push an entry, so the `{ from: Location }` shape `ProtectedLayout`
 * writes is narrowed rather than trusted, and anything else falls back to the
 * landing route.
 */
const resolveRedirect = (state: unknown): string => {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return AFTER_LOGIN_FALLBACK;
  }

  const from = state.from;
  if (typeof from === 'string') return from;
  if (typeof from !== 'object' || from === null || !('pathname' in from)) {
    return AFTER_LOGIN_FALLBACK;
  }

  const { pathname } = from;
  if (typeof pathname !== 'string') return AFTER_LOGIN_FALLBACK;

  const search =
    'search' in from && typeof from.search === 'string' ? from.search : '';
  const hash =
    'hash' in from && typeof from.hash === 'string' ? from.hash : '';

  return `${pathname}${search}${hash}`;
};

const LoginRoute = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const state: unknown = location.state;

  if (isAuthenticated) {
    return <Navigate to={resolveRedirect(state)} replace />;
  }

  return <LoginForm />;
};

export default LoginRoute;
