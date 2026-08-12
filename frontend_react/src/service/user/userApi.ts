import {
  AVATAR_ENDPOINT,
  PREFERENCES_ENDPOINT,
  USERS_ENDPOINT,
} from '../../config/api';
import { User, UserPreferenceKey, UserPreferences } from '../../interface/User';
import { apiRequest } from '../apiClient';

/**
 * Self-service, and deliberately its own endpoint: `PUT /api/users/{id}` is
 * admin-only, and this must not become the exception to that. It writes one
 * boolean on the token's own account and nothing else.
 *
 * Returns the account's full preference map, since the API merges rather than
 * replaces.
 */
export const updatePreference = async (
  token: string | null,
  key: UserPreferenceKey,
  value: boolean
): Promise<UserPreferences> => {
  const updated = await apiRequest<User>(PREFERENCES_ENDPOINT, {
    method: 'PATCH',
    token,
    json: { [key]: value },
  });

  return updated.preferences;
};

/**
 * Multipart, like post media. Returns the updated account so the caller can
 * refresh its cached copy without a second request.
 */
export const uploadAvatar = async (
  token: string | null,
  file: File
): Promise<User> => {
  const form = new FormData();
  form.append('avatar', file);

  return apiRequest<User>(AVATAR_ENDPOINT, { method: 'POST', token, form });
};

export const deleteAvatar = async (token: string | null): Promise<User> =>
  apiRequest<User>(AVATAR_ENDPOINT, { method: 'DELETE', token });

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
