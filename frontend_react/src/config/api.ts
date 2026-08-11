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
