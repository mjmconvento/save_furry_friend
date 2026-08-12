/** Mirrors `App\Enums\UserRole` on the API. */
export type UserRole = 'admin' | 'user';

/**
 * Mirrors `App\Enums\UserPreference`. Every preference is a boolean that
 * defaults to off, so a missing key and `false` mean the same thing - which is
 * what lets a session predating a preference behave safely rather than guessing.
 */
export type UserPreferenceKey = 'hide_heartbreaking_warning';

export type UserPreferences = Partial<Record<UserPreferenceKey, boolean>>;

export interface User {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  /** Additive, so an admin carries `user` too. Test membership, not equality. */
  roles: UserRole[];
  preferences: UserPreferences;
  /** Present only on `GET /api/users/{id}`; absent from list and search. */
  is_following?: boolean;
}
