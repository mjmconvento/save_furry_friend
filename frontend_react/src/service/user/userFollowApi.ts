import { USERS_ENDPOINT } from '../../config/api';
import { User } from '../../interface/User';
import { apiPage, apiRequest, Page } from '../apiClient';

interface FollowUserParams {
  id: string;
  token: string | null;
}

interface FollowResponse {
  message: string;
}

// RESTful nesting: the API moved from /users/follow/{id} to /users/{id}/follow
// when the routes became an apiResource.
export const followUser = async ({
  id,
  token,
}: FollowUserParams): Promise<FollowResponse> =>
  apiRequest<FollowResponse>(`${USERS_ENDPOINT}/${id}/follow`, {
    method: 'POST',
    token,
  });

export const unfollowUser = async ({
  id,
  token,
}: FollowUserParams): Promise<FollowResponse> =>
  apiRequest<FollowResponse>(`${USERS_ENDPOINT}/${id}/unfollow`, {
    method: 'POST',
    token,
  });

/**
 * A page of people who follow this account. Paginated like the feeds, so the
 * list can grow without an unbounded response.
 */
export const fetchFollowers = async (
  token: string | null,
  id: string,
  page = 1,
  signal?: AbortSignal
): Promise<Page<User>> =>
  apiPage<User>(`${USERS_ENDPOINT}/${id}/followers`, {
    token,
    query: { page: page > 1 ? String(page) : null },
    signal,
  });

/** A page of people this account follows. */
export const fetchFollowing = async (
  token: string | null,
  id: string,
  page = 1,
  signal?: AbortSignal
): Promise<Page<User>> =>
  apiPage<User>(`${USERS_ENDPOINT}/${id}/following`, {
    token,
    query: { page: page > 1 ? String(page) : null },
    signal,
  });

/**
 * Who to follow: the most prolific authors you do not follow yet. Deliberately
 * unpaginated - it is a prompt, not a directory.
 */
export const fetchSuggestions = async (
  token: string | null,
  signal?: AbortSignal
): Promise<User[]> =>
  apiRequest<User[]>(`${USERS_ENDPOINT}/suggestions`, { token, signal });
