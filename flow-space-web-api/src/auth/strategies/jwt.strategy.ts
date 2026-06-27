import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtConfigModel } from '../../models/configs/jwt-config.model';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        const jwtConfig = configService.get('jwt') as JwtConfigModel;

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConfig.secret,
            algorithms: [jwtConfig.algorithm],
        });
    }

    validate(payload: { userId: number; roleId: number; type: string }) {
        if (payload.type !== 'access') {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }
        if (!payload.userId && !payload.roleId) {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }
        return { userId: payload.userId, roleId: payload.roleId };
    }
}
