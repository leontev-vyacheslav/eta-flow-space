// store/auth-store.ts
import { create } from 'zustand';
import axios from 'axios';
import routes from '../constants/app-api-routes';
import { HttpConstants } from '../constants/app-http-constants';
import type { AuthUserModel } from '../models/auth-user-model';
import type { SignInModel } from '../models/signin-model';

export interface AuthState {
  user: AuthUserModel | null;

  // Actions
  initFromStorage: () => void;
  signIn: (signIn: SignInModel) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;

  // Derived (computed via selectors, not stored)
  getUserAuthDataFromStorage: () => AuthUserModel | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,

  getUserAuthDataFromStorage: () => {
    try {
      const raw = localStorage.getItem('@userAuthData');
      return raw ? (JSON.parse(raw) as AuthUserModel) : null;
    } catch (e) {
      console.error('Failed to read auth storage:', e);
      return null;
    }
  },

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
    const stored = get().getUserAuthDataFromStorage();
    if (!stored?.refreshToken) return null;

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
        return updated.accessToken;
      }
    } catch (e) {
      console.error('Token refresh failed:', e);
    }

    return null;
  },

  signOut: async () => {
    const stored = get().getUserAuthDataFromStorage();
    if (stored) {
      try {
        await axios.post(
          `${routes.host}${routes.accountSignOut}`,
          stored,
          {
            headers: {
              ...HttpConstants.Headers.ContentTypeJson,
              Authorization: `Bearer ${stored.accessToken}`,
            },
          }
        );
      } catch {
        console.error('Sign-out revocation failed');
      }
    }
    localStorage.removeItem('@userAuthData');
    set({ user: null });
  },
}));