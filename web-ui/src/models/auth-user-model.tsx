import { UserRoleModel } from './enums/user-role-model';

export type AuthUserModel = {
  role: UserRoleModel;

  login: string;

  token: string;
};
