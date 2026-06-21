import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayloadModel } from '../models/jwt-payload.model';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';
import { JwtConfigModel } from '../models/configs/jwt-config.model';
import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
    private readonly refreshSecret: string;
    private readonly accessExpiresIn: string;
    private readonly refreshExpiresIn: string;
    private readonly refreshTtlSeconds: number;

    constructor(
        private jwtService: JwtService,
        private readonly i18n: I18nService,
        private readonly configService: ConfigService,
        private readonly sharedStoreService: SharedStoreService,
    ) {
        const jwtConfig = this.configService.get('jwt') as JwtConfigModel;
        this.refreshSecret = jwtConfig.refreshSecret;
        this.accessExpiresIn = jwtConfig.expiresIn;
        this.refreshExpiresIn = jwtConfig.refreshExpiresIn;
        this.refreshTtlSeconds = this.parseDurationToSeconds(jwtConfig.refreshExpiresIn);
    }

    async signIn(payload: { login: string; userId: number; roleId: number }) {
        const accessPayload: JwtPayloadModel = {
            userId: payload.userId,
            roleId: payload.roleId,
            type: 'access',
        };
        const refreshPayload: JwtPayloadModel = {
            userId: payload.userId,
            roleId: payload.roleId,
            type: 'refresh',
        };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(accessPayload, {
                expiresIn: this.accessExpiresIn as StringValue,
            }),
            this.jwtService.signAsync(refreshPayload, {
                secret: this.refreshSecret,
                expiresIn: this.refreshExpiresIn as StringValue,
            }),
        ]);

        await this.sharedStoreService.saveRefreshToken(refreshToken, payload.userId, this.refreshTtlSeconds);

        return {
            accessToken,
            refreshToken,
            login: payload.login,
            role: payload.roleId,
        };
    }

    async refresh(refreshToken: string) {
        let payload: JwtPayloadModel;
        try {
            payload = await this.jwtService.verifyAsync<JwtPayloadModel>(refreshToken, {
                secret: this.refreshSecret,
            });
        } catch (error) {
            console.error(error);
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }

        if (payload.type !== 'refresh') {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }

        const userId = await this.sharedStoreService.getRefreshTokenUserId(refreshToken);
        if (userId === null) {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }

        await this.sharedStoreService.deleteRefreshToken(refreshToken);

        return this.signIn({ login: '', userId: payload.userId, roleId: payload.roleId });
    }

    async verifyToken(token: string) {
        try {
            return await this.jwtService.verifyAsync<JwtPayloadModel & object>(token);
        } catch {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }
    }

    private parseDurationToSeconds(duration: string): number {
        const match = duration.match(/^(\d+)([smhd])$/);
        if (!match) return 7 * 24 * 60 * 60;

        const value = parseInt(match[1], 10);
        const unit = match[2];
        const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
        return value * multipliers[unit];
    }
}
