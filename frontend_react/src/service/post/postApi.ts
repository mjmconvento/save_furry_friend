import { POSTS_ENDPOINT } from '../../config/api';
import { Post, PostSummary } from '../../interface/Post';
import { apiPage, apiRequest, Page } from '../apiClient';

/**
 * The feed is paginated server-side (20 per page), so this returns the page
 * rather than a bare array - dropping the paging would make everything past the
 * first 20 posts unreachable.
 */
export const fetchPosts = async (
  bearerToken: string | null,
  tags: string[],
  authorId: string | null = null,
  signal?: AbortSignal,
  page = 1
): Promise<Page<Post>> =>
  apiPage<Post>(POSTS_ENDPOINT, {
    token: bearerToken,
    // Page 1 is the default, so it stays out of the URL.
    query: { tags, authorId, page: page > 1 ? String(page) : null },
    signal,
  });

/**
 * Scoped exactly like the feeds - people you follow plus yourself - so the home
 * page numbers match what clicking through to a feed shows.
 */
export const fetchPostSummary = async (
  bearerToken: string | null,
  signal?: AbortSignal
): Promise<PostSummary> =>
  apiRequest<PostSummary>(`${POSTS_ENDPOINT}/summary`, {
    token: bearerToken,
    signal,
  });

export interface AddPostParams {
  content: string;
  tags: string[];
  medias?: File[];
  bearerToken: string | null;
}

// Authorship is not a client input: the server reads the author off the bearer
// token and ignores anything sent for it.
export const addPost = async ({
  content,
  tags,
  medias,
  bearerToken,
}: AddPostParams): Promise<Post> => {
  const form = new FormData();
  form.append('content', content);
  tags.forEach((tag) => form.append('tags[]', tag));
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
