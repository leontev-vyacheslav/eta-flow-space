import { CacheInterceptor, CACHE_KEY_METADATA } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequestModel } from '../../models';

@Injectable()
export class UserCacheInterceptor extends CacheInterceptor {
    trackBy(context: ExecutionContext): Promise<string | undefined | null> | string | undefined | null {
        const request = context.switchToHttp().getRequest<AuthenticatedRequestModel>();
        const userId = request.user?.userId;

        // Fall back to default behavior if no user (e.g. public routes)
        if (!userId) {
            return super.trackBy(context);
        }

        // Use custom @CacheKey if provided, otherwise fall back to the route path
        const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler()) ?? request.url;

        return `users:${userId}:${cacheKey}`; // e.g. "u42:/api/devices"
    }
}
