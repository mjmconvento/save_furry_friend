import { API_BASE_URL, POSTS_ENDPOINT } from '../../config/api';
import { getCsrfToken } from '../../util/csrf';

export const fetchPosts = async (
  bearerToken: string | null,
  tags: string[]
) => {
  const url = new URL(`${API_BASE_URL}/${POSTS_ENDPOINT}`);

  tags.forEach((tag) => url.searchParams.append('tags[]', tag));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }

  return await response.json();
};

interface AddUserParams {
  authorId: number | undefined;
  authorName: string | undefined;
  content: string;
  tags: string[];
  bearerToken: string | null;
}

export const addPost = async ({
  authorId,
  authorName,
  content,
  tags,
  bearerToken,
}: AddUserParams) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${bearerToken}`,
    'X-XSRF-Token': getCsrfToken() || '',
    accept: 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}/${POSTS_ENDPOINT}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ authorId, authorName, content, tags }),
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

export interface UpdatePostParams {
  id: number;
  content: string;
  tags: string[];
  token: string | null;
}

export const updatePost = async ({
  id,
  content,
  tags,
  token,
}: UpdatePostParams) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-XSRF-Token': getCsrfToken() || '',
    accept: 'application/json',
  };

  const response = await fetch(`${API_BASE_URL}/${POSTS_ENDPOINT}/${id}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      id,
      content,
      tags,
    }),
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

export interface DeletePostParams {
  id: number;
  token: string | null;
}

export const deletePost = async ({ id, token }: DeletePostParams) => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    'X-XSRF-Token': getCsrfToken() || '',
  };

  const response = await fetch(`${API_BASE_URL}/${POSTS_ENDPOINT}/${id}`, {
    method: 'DELETE',
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete post');
  }

  return true;
};
