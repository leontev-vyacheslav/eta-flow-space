import type { AuthUserModel } from './auth-user-model';
import type { SignInModel } from './signin-model';

export type SignInAsyncFunc = (singIn: SignInModel) => Promise<void>;
export type SignOutAsyncFunc = () => Promise<void>;
export type GetUserAuthDataFromStorageFunc = () => AuthUserModel | null;
// rejected: the server refused the refresh token (session is over);
// unavailable: no answer, timeout, rate limit or server error (session may still be valid, retry later)
export type RefreshAccessTokenResult =
  | { status: 'refreshed'; accessToken: string }
  | { status: 'rejected' }
  | { status: 'unavailable'; error: unknown };
export type RefreshAccessTokenFunc = () => Promise<RefreshAccessTokenResult>;

export type AuthContextModel = {
  user: AuthUserModel | null;

  signIn: SignInAsyncFunc;

  signOut: SignOutAsyncFunc;

  getUserAuthDataFromStorage: GetUserAuthDataFromStorageFunc;

  refreshAccessToken: RefreshAccessTokenFunc;

  isAdmin: () => boolean;

  isOperator: () => boolean;

  isGuest: () => boolean;
};
