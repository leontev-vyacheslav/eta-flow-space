import type { UserRoleModel } from './enums/user-role-model';

export type AuthUserModel = {
  role: UserRoleModel;

  login: string;

  accessToken: string;

  refreshToken: string;
};
