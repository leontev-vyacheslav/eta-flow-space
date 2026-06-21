import { Controller, Post, Body, Get, HttpCode, HttpStatus, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { createHash } from 'crypto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SignInModel } from '../models/sign-in.model';
import { I18nService } from 'nestjs-i18n';

@Controller()
export class AuthController {
    constructor(
        private authService: AuthService,
        private usersService: UserService,
        private readonly i18n: I18nService,
    ) {}

    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    async signIn(@Body() signIn: SignInModel) {
        const hashedPassword = createHash('sha256').update(signIn.password).digest('base64');

        const user = await this.usersService.getByName(signIn.login);

        if (!user || user.password !== hashedPassword) {
            throw new UnauthorizedException(this.i18n.t('errors.USER_NOT_FOUND_OR_WRONG_PASSWORD'));
        }

        return this.authService.signIn({
            login: user.name,
            userId: user.id,
            roleId: user.roleId,
        });
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    async refresh(@Body('refreshToken') refreshToken: string) {
        if (!refreshToken) {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }
        const userAuthData = await this.authService.refresh(refreshToken);
        if (!userAuthData) {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }
        return userAuthData;
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
