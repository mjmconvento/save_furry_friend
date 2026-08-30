import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import ForgotPasswordForm from '../component/login/ForgotPasswordForm';

/**
 * Sibling of `LoginRoute` and `RegisterRoute`: somebody already signed in does
 * not need a reset link emailed to them.
 */
const ForgotPasswordRoute = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <ForgotPasswordForm />;
};

export default ForgotPasswordRoute;
