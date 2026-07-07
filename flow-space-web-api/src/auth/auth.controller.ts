import { Controller, Post, Body, Get, HttpCode, HttpStatus, UnauthorizedException, UseGuards, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { createHash, timingSafeEqual } from 'crypto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SignInModel } from '../models/sign-in.model';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { UserDataModel } from '../database/models';
import { seconds, Throttle } from '@nestjs/throttler';

@Controller()
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(
        private authService: AuthService,
        private usersService: UserService,
        private readonly i18n: I18nService,
    ) {}

    @Post('sign-in')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: seconds(60) } })
    async signIn(@Body() signIn: SignInModel) {
        const user = await this.usersService.getByName(signIn.login);

        if (!user) {
            throw new UnauthorizedException(this.i18n.t('errors.USER_NOT_FOUND_OR_WRONG_PASSWORD'));
        }

        const isBcrypt = /^\$2[aby]\$/.test(user.password);

        if (isBcrypt) {
            // Password is hashed with bcrypt
            const isPasswordValid = await bcrypt.compare(signIn.password, user.password);
            if (!isPasswordValid) {
                throw new UnauthorizedException(this.i18n.t('errors.USER_NOT_FOUND_OR_WRONG_PASSWORD'));
            }
        } else {
            // Password is hashed with SHA-256
            const hashedPassword = createHash('sha256').update(signIn.password).digest('base64');
            const hashedBuf = Buffer.from(hashedPassword);
            const storedBuf = Buffer.from(user.password);
            if (hashedBuf.length !== storedBuf.length || !timingSafeEqual(hashedBuf, storedBuf)) {
                throw new UnauthorizedException(this.i18n.t('errors.USER_NOT_FOUND_OR_WRONG_PASSWORD'));
            }
            // Update password with bcrypt
            try {
                const hashedPasswordBcrypt = await bcrypt.hash(signIn.password, 10);
                user.password = hashedPasswordBcrypt;
                await (user as UserDataModel).save();
            } catch (error) {
                // Log error but don't block login
                this.logger.error(`Failed to migrate password for user ${user.id}: ${error}`);
                // User is still authenticated, just not migrated yet
            }
        }

        return this.authService.signIn({
            login: user.name,
            userId: user.id,
            roleId: user.roleId,
        });
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: seconds(60) } })
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
