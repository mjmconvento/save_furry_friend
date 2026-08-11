/**
 * One-way channel from the HTTP layer to whatever owns the session.
 *
 * `apiRequest` runs outside React, so it cannot read `useAuth()` to log the
 * user out when the server rejects the bearer token. Instead `AuthProvider`
 * registers its `logout` here once, and a 401 anywhere in the app reaches it
 * through a plain module-level call.
 */
let unauthorizedHandler: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: () => void): void => {
  unauthorizedHandler = fn;
};

/** No-op before a provider has registered - a 401 during boot has nothing to clear. */
export const notifyUnauthorized = (): void => {
  unauthorizedHandler?.();
};
