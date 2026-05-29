import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequestModel } from '../../models/authenticated-request.model';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequestModel>();

    return request.user;
});
