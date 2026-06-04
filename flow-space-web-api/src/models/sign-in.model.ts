import { IsString } from 'class-validator';

export class SignInModel {
    @IsString()
    login: string;

    @IsString()
    password: string;
}
