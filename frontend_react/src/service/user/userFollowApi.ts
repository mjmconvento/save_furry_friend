import { getCsrfToken } from '../../util/csrf';
import { API_BASE_URL, USERS_ENDPOINT } from '../../config/api';

interface followUserParams {
  id: string;
  token: string | null;
}

export const followUser = async ({ id, token }: followUserParams) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-XSRF-Token': getCsrfToken() || '',
    accept: 'application/json',
  };

  const response = await fetch(
    `${API_BASE_URL}/${USERS_ENDPOINT}/follow/${id}`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error: any = new Error(data.message);
    error.status = response.status;
    error.list = data.errors;

    throw error;
  }

  return data;
};

export const unfollowUser = async ({ id, token }: followUserParams) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-XSRF-Token': getCsrfToken() || '',
    accept: 'application/json',
  };

  const response = await fetch(
    `${API_BASE_URL}/${USERS_ENDPOINT}/unfollow/${id}`,
    {
      method: 'POST',
      headers,
      credentials: 'include',
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error: any = new Error(data.message);
    error.status = response.status;
    error.list = data.errors;

    throw error;
  }

  return data;
};
