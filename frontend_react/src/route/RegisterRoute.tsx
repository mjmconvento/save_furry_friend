import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import RegisterForm from '../component/login/RegisterForm';

/**
 * Sibling of `LoginRoute`: a signed-in visitor has no business on the sign-up
 * screen, and registration signs you in, so this is also where the form lands
 * once it succeeds.
 */
const RegisterRoute = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <RegisterForm />;
};

export default RegisterRoute;
