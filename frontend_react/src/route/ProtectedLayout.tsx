import { Suspense, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import {
  Navigate,
  Outlet,
  useLocation,
  useSearchParams,
} from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Topbar from '../component/template/Topbar';
import Sidebar from '../component/template/Sidebar';
import VerifyEmailBanner from '../component/template/VerifyEmailBanner';
import LoadingIndicator from '../component/template/LoadingIndicator';
import { useNotify } from '../component/template/ToastProvider';

/**
 * Auth gate plus the application shell for every signed-in page. Rendered as a
 * layout route so the router itself is never unmounted by a logout - the
 * redirect below happens inside the router, which is what keeps `/login`
 * addressable and lets us remember where the user was headed.
 */
const ProtectedLayout = () => {
  const { isAuthenticated, refreshAccount } = useAuth();
  const location = useLocation();
  const notify = useNotify();
  const [searchParams, setSearchParams] = useSearchParams();
  // The nav drawer is only ever open below `md`; the permanent sidebar at `md`
  // and up ignores this flag. It has to live here, above both `Topbar` (which
  // opens it) and `Sidebar` (which renders it), not inside either one.
  const [navOpen, setNavOpen] = useState(false);
  const justVerified = searchParams.has('verified');

  // A signed verification link redirects here with `?verified=1`. The flag was
  // flipped by a request from outside this tab, so the cached copy has to be
  // re-read; the parameter is then stripped to stop the toast repeating.
  //
  // Declared before the redirect below, because hooks cannot live after an early
  // return.
  useEffect(() => {
    if (!isAuthenticated || !justVerified) {
      return;
    }

    notify({
      message: 'Email address confirmed. Thank you.',
      severity: 'success',
    });
    refreshAccount().catch(() => {
      // The banner just stays until the next load; not worth a second toast.
    });

    setSearchParams(
      (previous) => {
        previous.delete('verified');

        return previous;
      },
      { replace: true }
    );
  }, [isAuthenticated, justVerified, notify, refreshAccount, setSearchParams]);

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
          {/* Inside `main`, not above this row: the permanent drawer is
              `position: fixed` with a z-index above the content, so a full-width
              banner out here had its first 240px painted over - unreadable from
              `md` up, fine on mobile where the drawer is display:none. */}
          <VerifyEmailBanner />

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
