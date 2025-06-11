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

export interface GetUserParams {
  id: string | undefined;
  token: string | null;
}

export const getUser = async ({ id, token }: GetUserParams) => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_BASE_URL}/${USERS_ENDPOINT}/${id}`, {
    method: 'GET',
    headers,
  });

  return response.json();
};

interface AddUserParams {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  token: string | null;
}

export const addUser = async ({
  firstName,
  middleName,
  lastName,
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
    body: JSON.stringify({ firstName, middleName, lastName, email, password }),
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
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  token: string | null;
}

export const updateUser = async ({
  id,
  firstName,
  middleName,
  lastName,
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
    body: JSON.stringify({ id, firstName, middleName, lastName, email }),
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
  id: string;
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
