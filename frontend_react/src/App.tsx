import { useAuth } from './AuthContext';
import LoginForm from './component/login/LoginForm';
import Topbar from './component/template/Topbar';
import Sidebar from './component/template/Sidebar';
import UserPage from './page/UserPage';
import { Box } from '@mui/material';
import { getCsrfToken } from './util/csrf';
import { Routes, Route } from 'react-router-dom';
import HomePage from './page/HomePage';
import HappyPostPage from './page/HappyPostPage';
import NeutralPostPage from './page/NeutralPostPage';
import { BrowserRouter } from 'react-router-dom';
import HeartbreakingPostPage from './page/HeartbreakingPostPage';
import NotFoundPage from './page/NotFoundPage';
import ProfilePage from './page/ProfilePage';
import MyProfilePage from './page/MyProfilePage';

const App = () => {
  const { isAuthenticated, logout } = useAuth();
  if (getCsrfToken() === undefined) {
    logout();
  }

  if (!isAuthenticated) return <LoginForm />;

  return (
    <BrowserRouter>
      <Topbar />
      <Box sx={{ display: 'flex' }}>
        <Sidebar />
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/happy_posts" element={<HappyPostPage />} />
            <Route path="/neutral_posts" element={<NeutralPostPage />} />
            <Route path="/my_profile" element={<MyProfilePage />} />
            <Route
              path="/profile/:id"
              element={<ProfilePage key={window.location.pathname} />}
            />
            <Route
              path="/heartbreaking_posts"
              element={<HeartbreakingPostPage />}
            />
            <Route path="/users" element={<UserPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
      </Box>
    </BrowserRouter>
  );
};

export default App;
