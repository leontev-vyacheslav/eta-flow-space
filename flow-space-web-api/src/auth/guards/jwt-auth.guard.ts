import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestUserModel } from '../../models';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly i18n: I18nService) {
        super();
    }

    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest(err: Error | null, user: RequestUserModel | false): any {
        if (err instanceof TokenExpiredError) {
            throw new UnauthorizedException(this.i18n.t('errors.SESSION_EXPIRED'));
        }
        if (err instanceof JsonWebTokenError) {
            throw new UnauthorizedException(this.i18n.t('errors.INVALID_AUTH_TOKEN'));
        }
        if (err || !user) {
            throw new UnauthorizedException(this.i18n.t('errors.TOKEN_EXPIRED_OR_INVALID'));
        }

        return user;
    }
}
