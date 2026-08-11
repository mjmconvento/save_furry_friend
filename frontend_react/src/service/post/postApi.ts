import { POSTS_ENDPOINT } from '../../config/api';
import { Post } from '../../interface/Post';
import { apiRequest } from '../apiClient';

export const fetchPosts = async (
  bearerToken: string | null,
  tags: string[],
  authorId: string | null = null
): Promise<Post[]> =>
  apiRequest<Post[]>(POSTS_ENDPOINT, {
    token: bearerToken,
    query: { tags, authorId },
  });

interface AddPostParams {
  // Author ids are UUID strings from Postgres, not integers.
  authorId: string | number | undefined;
  authorName: string | undefined;
  content: string;
  tags: string[];
  medias?: File[];
  bearerToken: string | null;
}

export const addPost = async ({
  authorId,
  authorName,
  content,
  tags,
  medias,
  bearerToken,
}: AddPostParams): Promise<Post> => {
  const form = new FormData();
  form.append('content', content);
  tags.forEach((tag) => form.append('tags[]', tag));
  form.append('authorId', authorId?.toString() || '');
  form.append('authorName', authorName || '');
  medias?.forEach((file) => form.append('medias[]', file));

  return apiRequest<Post>(POSTS_ENDPOINT, {
    method: 'POST',
    token: bearerToken,
    form,
  });
};

export interface UpdatePostParams {
  // Post ids are Mongo UUID strings.
  id: string;
  content: string;
  tags: string[];
  token: string | null;
}

export const updatePost = async ({
  id,
  content,
  tags,
  token,
}: UpdatePostParams): Promise<Post> =>
  apiRequest<Post>(`${POSTS_ENDPOINT}/${id}`, {
    method: 'PUT',
    token,
    json: { content, tags },
  });

export interface DeletePostParams {
  id: string;
  token: string | null;
}

export const deletePost = async ({
  id,
  token,
}: DeletePostParams): Promise<true> => {
  await apiRequest<unknown>(`${POSTS_ENDPOINT}/${id}`, {
    method: 'DELETE',
    token,
  });

  return true;
};
