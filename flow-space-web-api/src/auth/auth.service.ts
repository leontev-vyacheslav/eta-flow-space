import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayloadModel } from '../models/jwt-payload.model';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private readonly i18n: I18nService,
    ) {}

    async signIn(payload: { login: string; userId: number; roleId: number }) {
        const jwtPayload: JwtPayloadModel = {
            userId: payload.userId,
            roleId: payload.roleId,
        };
        return {
            token: await this.jwtService.signAsync(jwtPayload, {
                expiresIn: '24h',
            }),
            login: payload.login,
            role: payload.roleId,
        };
    }

    async verifyToken(token: string) {
        try {
            return await this.jwtService.verifyAsync<JwtPayloadModel & object>(token);
        } catch {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }
    }
}
