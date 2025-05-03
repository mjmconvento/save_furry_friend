import { useAuth } from './AuthContext';
import LoginForm from './component/login/LoginForm';
import Navbar from './component/template/Navbar';
import UserPage from './page/UserPage';

const App = () => {
  const { isAuthenticated } = useAuth()!;

  return (
    <div className="App">
      {isAuthenticated ? (
        <>
          <Navbar />
          <UserPage />
        </>
      ) : (
        <LoginForm />
      )}
    </div>
  );
};

export default App;
