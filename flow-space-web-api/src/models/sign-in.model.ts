import { IsString } from 'class-validator';

export class SignInModel {
    @IsString()
    login: string;

    @IsString()
    password: string;
}

export class AuthUserModel {
    id: number;

    name: string;

    roleId: number;

    password: string;
}
