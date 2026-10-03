import { Controller, Post, Body, Get, HttpCode, HttpStatus, UnauthorizedException, UseGuards, Logger, Req, Res } from '@nestjs/common';
import { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { createHash, timingSafeEqual } from 'crypto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SignInModel } from '../models/sign-in.model';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import { UserDataModel } from '../database/models';
import { AuthThrottlerGuard } from './guards/auth-throttler.guard';

const REFRESH_COOKIE = 'refreshToken';

// HttpOnly keeps the token away from page scripts; SameSite=Strict stops other sites from triggering a refresh or sign-out.
const REFRESH_COOKIE_OPTIONS: CookieOptions = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' };

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
    @UseGuards(AuthThrottlerGuard)
    async signIn(@Body() signIn: SignInModel, @Res({ passthrough: true }) res: Response) {
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
                this.logger.error(`Failed to migrate password for user ${user.id}`, error);
                // User is still authenticated, just not migrated yet
            }
        }

        const userAuthData = await this.authService.signIn({
            login: user.name,
            userId: user.id,
            roleId: user.roleId,
        });
        this.setRefreshCookie(res, userAuthData.refreshToken);

        return userAuthData;
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AuthThrottlerGuard)
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = this.getRefreshTokens(req)[0];
        if (!refreshToken) {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }
        const userAuthData = await this.authService.refresh(refreshToken);
        if (!userAuthData) {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }
        this.setRefreshCookie(res, userAuthData.refreshToken);

        return userAuthData;
    }

    // No access-token guard: the access token has often expired by the time the user signs out,
    // and holding the refresh token is proof enough to revoke it. Always 204, so it reveals nothing.
    @Post('sign-out')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(AuthThrottlerGuard)
    async signOut(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        for (const refreshToken of this.getRefreshTokens(req)) {
            await this.authService.signOut(refreshToken);
        }
        res.clearCookie(REFRESH_COOKIE, REFRESH_COOKIE_OPTIONS);
    }

    @Get('health-check')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    healthCheck() {
        return {
            message: 'Пользователь аутентифицирован.',
        };
    }

    private setRefreshCookie(res: Response, refreshToken: string) {
        res.cookie(REFRESH_COOKIE, refreshToken, { ...REFRESH_COOKIE_OPTIONS, maxAge: this.authService.refreshTtlSeconds * 1000 });
    }

    // The cookie first, then the request body: UIs released before the cookie still send the token in the body,
    // and their next refresh moves it into the cookie. Responses keep the token in the body for the same UIs,
    // which sign out when it is missing. Drop both body paths once every user has refreshed (7 days after release).
    private getRefreshTokens(req: Request): string[] {
        const fromCookie: unknown = req.cookies?.[REFRESH_COOKIE];
        const fromBody = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
        const tokens = [fromCookie, fromBody].filter((t): t is string => typeof t === 'string' && t !== '');

        return [...new Set(tokens)];
    }
}
