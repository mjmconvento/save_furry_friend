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
  title: string;
  author: string;
  content: string;
  tags: string[];
  bearerToken: string | null;
}

export const addPost = async ({
  title,
  author,
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
    body: JSON.stringify({ title, author, content, tags }),
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
