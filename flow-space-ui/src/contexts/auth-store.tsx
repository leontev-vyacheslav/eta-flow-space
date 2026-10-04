// store/auth-store.ts
import { create } from 'zustand';
import axios from 'axios';
import routes from '../constants/app-api-routes';
import { HttpConstants } from '../constants/app-http-constants';
import type { AuthUserModel } from '../models/auth-user-model';
import type { SignInModel } from '../models/signin-model';
import type { RefreshAccessTokenFunc, RefreshAccessTokenResult } from '../models/auth-context';

export interface AuthState {
  user: AuthUserModel | null;

  // Actions
  initFromStorage: () => void;
  signIn: (signIn: SignInModel) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccessToken: RefreshAccessTokenFunc;

  // Derived (computed via selectors, not stored)
  getUserAuthDataFromStorage: () => AuthUserModel | null;
}

let refreshPromise: Promise<RefreshAccessTokenResult> | null = null;

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

export const useAuthStore = create<AuthState>((set, get) => ({
  // read synchronously so the first render already uses the signed-in routes;
  // starting with null let the sign-in routes redirect to /sign-in and lose the current URL on reload
  user: readStoredUser(),

  getUserAuthDataFromStorage: readStoredUser,

  initFromStorage: () => {
    const user = get().getUserAuthDataFromStorage();
    set({ user });
  },

  signIn: async (signInModel: SignInModel) => {
    const response = await axios.post(
      `${routes.host}${routes.accountSignIn}`,
      signInModel,
      authRequestConfig
    );

    if (response?.status === HttpConstants.StatusCodes.Ok && response.data) {
      set({ user: storeUser(response.data) });
    }
  },

  refreshAccessToken: async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async (): Promise<RefreshAccessTokenResult> => {
      const stored = readStoredUser();
      if (!stored) return { status: 'rejected' };

      try {
        const response = await axios.post(
          `${routes.host}${routes.accountRefresh}`,
          undefined,
          authRequestConfig
        );

        if (response?.status === HttpConstants.StatusCodes.Ok && response.data) {
          const updated = storeUser({ ...stored, accessToken: response.data.accessToken });
          set({ user: updated });
          return { status: 'refreshed', accessToken: updated.accessToken };
        }

        return { status: 'rejected' };
      } catch (e) {
        console.error('Token refresh failed:', e);
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;

        return status !== undefined && REFRESH_REJECTED_STATUSES.includes(status)
          ? { status: 'rejected' }
          : { status: 'unavailable', error: e };
      }
    })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  },

  signOut: async () => {
    const stored = readStoredUser();
    if (stored) {
      try {
        // revoke the refresh token (from the cookie) on the server and clear the cookie
        await axios.post(
          `${routes.host}${routes.accountSignOut}`,
          undefined,
          authRequestConfig
        );
      } catch {
        console.error('Sign-out revocation failed');
      }
    }
    localStorage.removeItem('@userAuthData');
    set({ user: null });
  },
}));