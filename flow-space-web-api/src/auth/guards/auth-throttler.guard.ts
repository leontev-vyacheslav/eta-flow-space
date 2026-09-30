import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

// Rate limit for the auth endpoints. Every request arrives from the gateway container, so req.ip is
// the same for all users; the client address comes from the X-Real-IP header the gateway sets.
// Sign-in also counts per login, so users behind one office IP don't use up each other's attempts.
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
    protected getTracker(req: Request): Promise<string> {
        const realIp = req.headers['x-real-ip'];
        const ip = typeof realIp === 'string' && realIp ? realIp : (req.ip ?? '');
        const login = (req.body as { login?: unknown } | undefined)?.login;

        return Promise.resolve(typeof login === 'string' ? `${ip}:${login.toLowerCase()}` : ip);
    }
}
