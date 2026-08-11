import { USERS_ENDPOINT } from '../../config/api';
import { User } from '../../interface/User';
import { apiRequest } from '../apiClient';

export const fetchUsers = async (
  token: string | null,
  signal?: AbortSignal
): Promise<User[]> => apiRequest<User[]>(USERS_ENDPOINT, { token, signal });

export const searchUsers = async (
  token: string | null,
  keyword: string,
  signal?: AbortSignal
): Promise<User[]> =>
  apiRequest<User[]>(`${USERS_ENDPOINT}/search/${keyword}`, { token, signal });

export interface GetUserParams {
  id: string | undefined;
  token: string | null;
  signal?: AbortSignal;
}

export const getUser = async ({
  id,
  token,
  signal,
}: GetUserParams): Promise<User> =>
  apiRequest<User>(`${USERS_ENDPOINT}/${id}`, { token, signal });

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
}: AddUserParams): Promise<User> =>
  apiRequest<User>(USERS_ENDPOINT, {
    method: 'POST',
    token,
    json: { firstName, middleName, lastName, email, password },
  });

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
}: UpdateUserParams): Promise<User> =>
  apiRequest<User>(`${USERS_ENDPOINT}/${id}`, {
    method: 'PUT',
    token,
    json: { firstName, middleName, lastName, email },
  });

export interface DeleteUserParams {
  id: string;
  token: string | null;
}

export const deleteUser = async ({
  id,
  token,
}: DeleteUserParams): Promise<true> => {
  await apiRequest<unknown>(`${USERS_ENDPOINT}/${id}`, {
    method: 'DELETE',
    token,
  });

  return true;
};
