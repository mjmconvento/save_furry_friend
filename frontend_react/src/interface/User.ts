export interface User {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  /** Present only on `GET /api/users/{id}`; absent from list and search. */
  is_following?: boolean;
}
