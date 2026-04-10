import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtConfig } from '../../config/interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        const jwtConfig = configService.get('jwt') as JwtConfig;

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtConfig.secret,
            algorithms: [jwtConfig.algorithm],
        });
    }

    validate(payload: { userId: number; roleId: number }) {
        if (!payload.userId && !payload.roleId) {
            throw new UnauthorizedException();
        }
        return { userId: payload.userId, roleId: payload.roleId };
    }
}
