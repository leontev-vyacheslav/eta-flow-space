import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestUserModel } from '../../models';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest(err: Error | null, user: RequestUserModel | false): any {
        if (err instanceof TokenExpiredError) {
            throw new UnauthorizedException('Сессия истекла, пожалуйста, войдите снова');
        }
        if (err instanceof JsonWebTokenError) {
            throw new UnauthorizedException('Неверный токен авторизации');
        }
        if (err || !user) {
            throw new UnauthorizedException('Токен авторизации неверный или истек');
        }

        return user;
    }
}
