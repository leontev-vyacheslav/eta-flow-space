// rejected: the server refused the refresh token (session is over);
// unavailable: no answer, timeout, rate limit or server error (session may still be valid, retry later)
export type RefreshAccessTokenResult =
  | { status: 'refreshed'; accessToken: string }
  | { status: 'rejected' }
  | { status: 'unavailable'; error: unknown };
export type RefreshAccessTokenFunc = () => Promise<RefreshAccessTokenResult>;
