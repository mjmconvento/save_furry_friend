import { useAuth } from '../../AuthContext';

export const authFetch = async (input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, {
    ...init,
    credentials: 'include', // Always include cookies
  });

  if (response.status === 419 || response.status === 401) {
    // Token expired or unauthorized
    const { logout } = useAuth(); // This won't work outside React context
    logout();
  }

  return response;
};
