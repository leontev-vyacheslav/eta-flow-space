// store/auth-selectors.ts
import type { AuthState } from './auth-store'; // export AuthState from the store
import { UserRoles } from '../models/enums/user-role-model';

export const selectUser = (s: AuthState) => s.user;
export const selectIsAdmin = (s: AuthState) =>
  s.user?.role === UserRoles.admin;
export const selectIsOperator = (s: AuthState) =>
  s.user?.role === UserRoles.operator;
export const selectIsGuest = (s: AuthState) =>
  s.user?.role === UserRoles.guest; // ← also fixes the bug in your original code