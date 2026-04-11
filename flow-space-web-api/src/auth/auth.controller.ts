import { Controller, Post, Body, Get, HttpCode, HttpStatus, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { IsString } from 'class-validator';
import { createHash } from 'crypto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class SignInModel {
    @IsString()
    login: string;

    @IsString()
    password: string;
}

@Controller()
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UsersService,
    ) {}

    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    async signIn(@Body() signIn: SignInModel) {
        const hashedPassword = createHash('sha256').update(signIn.password).digest('base64');

        const user = await this.usersService.findByName(signIn.login);

        if (!user || user.password !== hashedPassword) {
            throw new UnauthorizedException('Пользователь не найден или указан неверный пароль.');
        }

        return this.authService.signIn({
            login: user.name,
            userId: user.id,
            roleId: user.roleId,
        });
    }

    @Get('health-check')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    healthCheck() {
        return {
            message: 'Пользователь аутентифицирован.',
        };
    }
}
