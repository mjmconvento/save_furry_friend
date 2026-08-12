import { REGISTER_ENDPOINT, VERIFICATION_ENDPOINT } from '../../config/api';
import { User } from '../../interface/User';
import { apiRequest } from '../apiClient';

export interface RegisterParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface RegisterResult {
  token: string;
  user: User;
}

/**
 * Public registration. A different endpoint from `POST /api/users`, which
 * administers other people's accounts and stays admin-only.
 *
 * The response carries a token, so the caller can sign the new account straight
 * in. `apiRequest` is not used for the envelope here: `token` and `user` sit
 * beside each other at the top level, exactly as `login` returns them.
 */
export const register = async ({
  firstName,
  lastName,
  email,
  password,
  passwordConfirmation,
}: RegisterParams): Promise<RegisterResult> =>
  apiRequest<RegisterResult>(REGISTER_ENDPOINT, {
    method: 'POST',
    token: null,
    json: {
      firstName,
      lastName,
      email,
      password,
      // Laravel's `confirmed` rule looks for this exact snake_case field.
      password_confirmation: passwordConfirmation,
    },
  });

/** Asks for another verification email, for the signed-in account. */
export const resendVerification = async (
  token: string | null
): Promise<{ message: string }> =>
  apiRequest<{ message: string }>(VERIFICATION_ENDPOINT, {
    method: 'POST',
    token,
  });
