// Fail fast rather than defaulting: a silent localhost fallback in a production
// bundle is worse than a build that refuses to start.
const base = import.meta.env.VITE_API_BASE_URL;

if (!base) {
  throw new Error(
    'VITE_API_BASE_URL is not set. Copy .env.example to .env and set it.'
  );
}

export const API_BASE_URL: string = base;
export const USERS_ENDPOINT = 'api/users';
export const POSTS_ENDPOINT = 'api/posts';
// Threads hang off a post to read and write, but a single comment is addressed
// on its own to delete - the API binds that route to the comment alone.
export const COMMENTS_ENDPOINT = 'api/comments';
export const TRIVIA_ENDPOINT = 'api/trivia';
// Singular `user`: the token's own account. Distinct from the admin-only
// `api/users` collection, and takes no id.
export const PREFERENCES_ENDPOINT = 'api/user/preferences';
export const AVATAR_ENDPOINT = 'api/user/avatar';
export const REGISTER_ENDPOINT = 'api/register';
// Public: the caller cannot sign in, which is the problem being solved.
export const PASSWORD_FORGOT_ENDPOINT = 'api/password/forgot';
export const PASSWORD_RESET_ENDPOINT = 'api/password/reset';
export const VERIFICATION_ENDPOINT = 'api/email/verification-notification';
