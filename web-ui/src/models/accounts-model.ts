import type { UserRoleModel } from './enums/user-role-model';

export type AccountModel = {
    id: string;

    role: UserRoleModel;

    login: string;

    password: string;
}

export type ExtendedAccountModel = AccountModel & {
    confirmedPassword: string;
}


export type AccountsModel = {
    items: AccountModel[]
}
