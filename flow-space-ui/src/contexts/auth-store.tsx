// store/auth-store.ts
import { create } from 'zustand';
import axios, { CanceledError } from 'axios';
import routes from '../constants/app-api-routes';
import { HttpConstants } from '../constants/app-http-constants';
import type { AuthUserModel } from '../models/auth-user-model';
import type { SignInModel } from '../models/signin-model';
import type { RefreshAccessTokenFunc, RefreshAccessTokenResult } from '../models/auth-context';
import { createRequestDeadline } from './app-data/request-cancellation';

export interface AuthState {
  user: AuthUserModel | null;

  // Actions
  signIn: (signIn: SignInModel) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccessToken: RefreshAccessTokenFunc;

  // Derived (computed via selectors, not stored)
  getUserAuthDataFromStorage: () => AuthUserModel | null;
}

let refreshPromise: Promise<RefreshAccessTokenResult> | null = null;
let refreshDeadline: ReturnType<typeof createRequestDeadline> | null = null;
let signOutPromise: Promise<void> | null = null;
let sessionVersion = 0;

// only these answers mean the refresh token itself is no good; anything else (no answer, 429, 5xx) is temporary
const REFRESH_REJECTED_STATUSES: number[] = [
  HttpConstants.StatusCodes.BadRequest,
  HttpConstants.StatusCodes.Unauthorized,
  HttpConstants.StatusCodes.Forbidden,
];

// The refresh token lives in an HttpOnly cookie that the API sets and scripts cannot read; the auth calls send
// it with withCredentials (needed in dev, where the API is on another port).

const authRequestConfig = { withCredentials: true };

function readStoredUser(): AuthUserModel | null {
  try {
    const raw = localStorage.getItem('@userAuthData');
    return raw ? (JSON.parse(raw) as AuthUserModel) : null;
  } catch (e) {
    console.error('Failed to read auth storage:', e);
    return null;
  }
}

// keeps only what the UI needs; never the refresh token
function storeUser(data: AuthUserModel): AuthUserModel {
  const user: AuthUserModel = { login: data.login, role: data.role, accessToken: data.accessToken };
  localStorage.setItem('@userAuthData', JSON.stringify(user));

  return user;
}

export const useAuthStore = create<AuthState>((set) => ({
  // read synchronously so the first render already uses the signed-in routes;
  // starting with null let the sign-in routes redirect to /sign-in and lose the current URL on reload
  user: readStoredUser(),

  getUserAuthDataFromStorage: readStoredUser,

  signIn: async (signInModel: SignInModel) => {
    // A delayed sign-out response clears the cookie: finish it before issuing a new one.
    if (signOutPromise) {
      await signOutPromise;
    }
    const response = await axios.post(
      `${routes.host}${routes.accountSignIn}`,
      signInModel,
      authRequestConfig
    );

    if (response?.status === HttpConstants.StatusCodes.Ok && response.data) {
      sessionVersion++;
      set({ user: storeUser(response.data) });
    }
  },

  refreshAccessToken: async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    const stored = readStoredUser();
    if (!stored) {
      return { status: 'rejected' };
    }
    const version = sessionVersion;
    const deadline = createRequestDeadline(HttpConstants.Timeouts.AuthRefresh);
    refreshDeadline = deadline;
    const pending = (async (): Promise<RefreshAccessTokenResult> => {

      try {
        const response = await axios.post(
          `${routes.host}${routes.accountRefresh}`,
          undefined,
          { ...authRequestConfig, timeout: HttpConstants.Timeouts.AuthRefresh, signal: deadline.signal }
        );

        // A late refresh must not restore a session that has been signed out or replaced.
        if (version !== sessionVersion || deadline.signal.aborted) {
          return { status: 'unavailable', error: new CanceledError('Session replaced') };
        }
        if (response?.status === HttpConstants.StatusCodes.Ok && response.data) {
          const updated = storeUser({ ...stored, accessToken: response.data.accessToken });
          set({ user: updated });
          return { status: 'refreshed', accessToken: updated.accessToken };
        }

        return { status: 'rejected' };
      } catch (e) {
        if (!axios.isAxiosError(e)) {
          console.error('Token refresh failed:', e);
        }
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;

        return status !== undefined && REFRESH_REJECTED_STATUSES.includes(status)
          ? { status: 'rejected' }
          : { status: 'unavailable', error: e };
      } finally {
        deadline.dispose();
      }
    })();
    refreshPromise = pending;

    try {
      return await pending;
    } finally {
      if (refreshPromise === pending) {
        refreshPromise = null;
        refreshDeadline = null;
      }
    }
  },

  signOut: async () => {
    const stored = readStoredUser();
    // Stop authenticated providers immediately, even if revoking the cookie stalls.
    sessionVersion++;
    localStorage.removeItem('@userAuthData');
    set({ user: null });
    refreshDeadline?.abort();
    refreshDeadline = null;
    refreshPromise = null;
    if (signOutPromise) {
      return signOutPromise;
    }
    if (stored) {
      const deadline = createRequestDeadline(HttpConstants.Timeouts.AuthRefresh);
      const pending = axios.post(
        `${routes.host}${routes.accountSignOut}`,
        undefined,
        { ...authRequestConfig, timeout: HttpConstants.Timeouts.AuthRefresh, signal: deadline.signal }
      ).then(() => {}).catch(() => {
        console.warn('Sign-out revocation failed');
      }).finally(() => { deadline.dispose(); });
      signOutPromise = pending;
      try {
        // revoke the refresh token (from the cookie) on the server and clear the cookie
        await pending;
      } finally {
        if (signOutPromise === pending) {
          signOutPromise = null;
        }
      }
    }
  },
}));
