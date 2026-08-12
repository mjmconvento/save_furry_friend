import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginRoute from './route/LoginRoute';
import AdminRoute from './route/AdminRoute';
import ProtectedLayout from './route/ProtectedLayout';

// Pages load on demand: the login screen no longer pays for photoswipe,
// react-dropzone and every feed before it can paint. `LoginForm` stays a static
// import (via `LoginRoute`) for exactly that reason.
const HappyPostPage = lazy(() => import('./page/HappyPostPage'));
const NeutralPostPage = lazy(() => import('./page/NeutralPostPage'));
const HeartbreakingPostPage = lazy(
  () => import('./page/HeartbreakingPostPage')
);
const MyProfilePage = lazy(() => import('./page/MyProfilePage'));
const ProfilePage = lazy(() => import('./page/ProfilePage'));
const UserPage = lazy(() => import('./page/UserPage'));
const NotFoundPage = lazy(() => import('./page/NotFoundPage'));

// The router is mounted once, unconditionally: auth is enforced per route by
// `ProtectedLayout`, so logging out navigates instead of destroying history.
const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedLayout />}>
        <Route index element={<Navigate to="/happy_posts" replace />} />
        <Route path="/happy_posts" element={<HappyPostPage />} />
        <Route path="/neutral_posts" element={<NeutralPostPage />} />
        <Route
          path="/heartbreaking_posts"
          element={<HeartbreakingPostPage />}
        />
        <Route path="/my_profile" element={<MyProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route element={<AdminRoute />}>
          <Route path="/users" element={<UserPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
