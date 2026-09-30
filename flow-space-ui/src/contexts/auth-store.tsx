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

function readStoredUser(): AuthUserModel | null {
  try {
    const raw = localStorage.getItem('@userAuthData');
    return raw ? (JSON.parse(raw) as AuthUserModel) : null;
  } catch (e) {
    console.error('Failed to read auth storage:', e);
    return null;
  }
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
      signInModel
    );

    if (response?.status === HttpConstants.StatusCodes.Ok && response.data) {
      const userAuthData: AuthUserModel = response.data;
      localStorage.setItem('@userAuthData', JSON.stringify(userAuthData));
      set({ user: userAuthData });
    }
  },

  refreshAccessToken: async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async (): Promise<RefreshAccessTokenResult> => {
      const stored = get().getUserAuthDataFromStorage();
      if (!stored?.refreshToken) return { status: 'rejected' };

      try {
        const response = await axios.post(
          `${routes.host}${routes.accountRefresh}`,
          { refreshToken: stored.refreshToken }
        );

        if (response?.status === HttpConstants.StatusCodes.Ok && response.data) {
          const updated: AuthUserModel = {
            ...stored,
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
          };
          localStorage.setItem('@userAuthData', JSON.stringify(updated));
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
    const stored = get().getUserAuthDataFromStorage();
    if (stored) {
      try {
        // revoke the refresh token on the server; the endpoint needs nothing else
        await axios.post(
          `${routes.host}${routes.accountSignOut}`,
          { refreshToken: stored.refreshToken },
          { headers: HttpConstants.Headers.ContentTypeJson }
        );
      } catch {
        console.error('Sign-out revocation failed');
      }
    }
    localStorage.removeItem('@userAuthData');
    set({ user: null });
  },
}));