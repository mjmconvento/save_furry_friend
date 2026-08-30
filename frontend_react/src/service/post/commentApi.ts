import { POSTS_ENDPOINT, COMMENTS_ENDPOINT } from '../../config/api';
import { Comment } from '../../interface/Comment';
import { apiPage, apiRequest, Page } from '../apiClient';

/**
 * One post's thread, oldest first - the order it reads in. Fetched only when a
 * thread is opened: a feed page carries twenty posts and most threads are never
 * expanded.
 */
export const fetchComments = async (
  token: string | null,
  postId: string,
  page = 1,
  signal?: AbortSignal
): Promise<Page<Comment>> =>
  apiPage<Comment>(`${POSTS_ENDPOINT}/${postId}/comments`, {
    token,
    query: { page: page > 1 ? String(page) : null },
    signal,
  });

export interface AddCommentParams {
  postId: string;
  content: string;
  token: string | null;
}

/**
 * Authorship is not a client input: the server reads the author off the bearer
 * token, exactly as it does when creating a post.
 */
export const addComment = async ({
  postId,
  content,
  token,
}: AddCommentParams): Promise<Comment> =>
  apiRequest<Comment>(`${POSTS_ENDPOINT}/${postId}/comments`, {
    method: 'POST',
    token,
    json: { content },
  });

export interface DeleteCommentParams {
  id: string;
  token: string | null;
}

/** Bound to the comment alone; the API decides whether the caller may. */
export const deleteComment = async ({
  id,
  token,
}: DeleteCommentParams): Promise<true> => {
  await apiRequest<{ message: string }>(`${COMMENTS_ENDPOINT}/${id}`, {
    method: 'DELETE',
    token,
  });

  return true;
};
