import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from '../interfaces/request-user.interface';

interface AuthenticatedRequest extends Request {
    user: RequestUser;
}

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.user;
});
