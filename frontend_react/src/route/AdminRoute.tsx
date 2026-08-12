import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const NOT_FOR_YOU = '/happy_posts';

/**
 * Admin gate for user administration. Rendered inside `ProtectedLayout`, so
 * being signed in is already established by the time this runs.
 *
 * Hiding the sidebar link is not a gate - the path stays typeable, and a
 * non-admin who reached the page would watch it fail with a 403 from every
 * request it makes. This redirects instead.
 *
 * It is still only a UI decision: the role comes from `localStorage`, which the
 * user can edit. Editing it gets you an empty page full of 403s, because
 * `UserPolicy` is the real boundary.
 */
const AdminRoute = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to={NOT_FOR_YOU} replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
