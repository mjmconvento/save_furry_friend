import { useAuth } from './AuthContext';
import LoginForm from './component/login/LoginForm';
import Topbar from './component/template/Topbar';
import Sidebar from './component/template/Sidebar';
import UserPage from './page/UserPage';
import { Box, Toolbar } from '@mui/material';
import { getCsrfToken } from './util/csrf';

const App = () => {
  const { isAuthenticated, logout } = useAuth();
  if (getCsrfToken() === undefined) {
    logout();
  }

  if (!isAuthenticated) return <LoginForm />;

  return (
    <>
      <Topbar />
      <Box sx={{ display: 'flex' }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <UserPage />
        </Box>
      </Box>
    </>
  );
};

export default App;
