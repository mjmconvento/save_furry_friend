import { Suspense, useState } from 'react';
import { Box } from '@mui/material';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Topbar from '../component/template/Topbar';
import Sidebar from '../component/template/Sidebar';
import LoadingIndicator from '../component/template/LoadingIndicator';

/**
 * Auth gate plus the application shell for every signed-in page. Rendered as a
 * layout route so the router itself is never unmounted by a logout - the
 * redirect below happens inside the router, which is what keeps `/login`
 * addressable and lets us remember where the user was headed.
 */
const ProtectedLayout = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  // The nav drawer is only ever open below `md`; the permanent sidebar at `md`
  // and up ignores this flag. It has to live here, above both `Topbar` (which
  // opens it) and `Sidebar` (which renders it), not inside either one.
  const [navOpen, setNavOpen] = useState(false);

  // `from` is the whole location, so the query string and hash survive the
  // round trip through the login screen.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <>
      <Topbar onMenuClick={() => setNavOpen(true)} />
      <Box sx={{ display: 'flex' }}>
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <Box
          component="main"
          sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}
        >
          {/* One boundary for every lazily loaded page: the shell stays
              painted while the next page's chunk arrives. */}
          <Suspense fallback={<LoadingIndicator />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </>
  );
};

export default ProtectedLayout;
