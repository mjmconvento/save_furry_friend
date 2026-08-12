/** Mirrors `App\Enums\UserRole` on the API. */
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  /** Additive, so an admin carries `user` too. Test membership, not equality. */
  roles: UserRole[];
  /** Present only on `GET /api/users/{id}`; absent from list and search. */
  is_following?: boolean;
}
