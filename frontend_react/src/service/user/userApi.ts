import { getCsrfToken } from '../../util/csrf';
import { API_BASE_URL, USERS_ENDPOINT } from '../../config/api';

export const fetchUsers = async (token: string | null) => {
  const response = await fetch(`${API_BASE_URL}/${USERS_ENDPOINT}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return await response.json();
};

interface AddUserParams {
  name: string;
  email: string;
  password: string;
  token: string | null;
}

export const addUser = async ({
  name,
  email,
  password,
  token,
}: AddUserParams) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-XSRF-Token': getCsrfToken() || '',
    accept: 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}/${USERS_ENDPOINT}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error: any = new Error(data.message);
    error.status = response.status;
    error.list = data.errors;

    throw error;
  }

  return data;
};

export interface UpdateUserParams {
  id: number;
  name: string;
  email: string;
  token: string | null;
}

export const updateUser = async ({
  id,
  name,
  email,
  token,
}: UpdateUserParams) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-XSRF-Token': getCsrfToken() || '',
    accept: 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}/${USERS_ENDPOINT}/${id}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify({ id, name, email }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error: any = new Error(data.message);
    error.status = response.status;
    error.list = data.errors;

    throw error;
  }

  return data;
};

export interface DeleteUserParams {
  id: number;
  token: string | null;
}

export const deleteUser = async ({ id, token }: DeleteUserParams) => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    'X-XSRF-Token': getCsrfToken() || '',
  };

  const response = await fetch(`${API_BASE_URL}/${USERS_ENDPOINT}/${id}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete user');
  }

  return true;
};
