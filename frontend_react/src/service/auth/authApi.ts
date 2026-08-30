import {
  PASSWORD_FORGOT_ENDPOINT,
  PASSWORD_RESET_ENDPOINT,
  REGISTER_ENDPOINT,
  VERIFICATION_ENDPOINT,
} from '../../config/api';
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

/**
 * Asks for a reset link. Resolves the same way whether or not the address has
 * an account - the API answers uniformly on purpose, so the SPA has nothing
 * more specific it could honestly show.
 */
export const requestPasswordReset = async (
  email: string
): Promise<{ message: string }> =>
  apiRequest<{ message: string }>(PASSWORD_FORGOT_ENDPOINT, {
    method: 'POST',
    token: null,
    json: { email },
  });

export interface ResetPasswordParams {
  /** Both come from the emailed link's query, not from the person. */
  token: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export const resetPassword = async ({
  token,
  email,
  password,
  passwordConfirmation,
}: ResetPasswordParams): Promise<{ message: string }> =>
  apiRequest<{ message: string }>(PASSWORD_RESET_ENDPOINT, {
    method: 'POST',
    token: null,
    json: {
      token,
      email,
      password,
      // Laravel's `confirmed` rule looks for this exact snake_case field.
      password_confirmation: passwordConfirmation,
    },
  });
