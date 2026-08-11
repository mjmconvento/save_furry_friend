import { USERS_ENDPOINT } from '../../config/api';
import { apiRequest } from '../apiClient';

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
