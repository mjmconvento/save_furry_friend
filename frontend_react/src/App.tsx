import { useState } from 'react';
import { useAuth } from './AuthContext';
import LoginForm from './component/login/LoginForm';
import Topbar from './component/template/Topbar';
import Sidebar from './component/template/Sidebar';
import UserPage from './page/UserPage';
import { Box } from '@mui/material';
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
  const { isAuthenticated } = useAuth();
  // The nav drawer is only ever open below `md`; the permanent sidebar at
  // `md` and up ignores this flag.
  const [navOpen, setNavOpen] = useState(false);

  if (!isAuthenticated) return <LoginForm />;

  return (
    <BrowserRouter>
      <Topbar onMenuClick={() => setNavOpen(true)} />
      <Box sx={{ display: 'flex' }}>
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <Box
          component="main"
          sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}
        >
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
