import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { I18nService } from 'nestjs-i18n';
import * as bcrypt from 'bcrypt';
import * as cookieParser from 'cookie-parser';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';

describe('AuthController refresh-token cookie', () => {
    let app: INestApplication<App>;
    let authService: { signIn: jest.Mock; refresh: jest.Mock; signOut: jest.Mock; refreshTtlSeconds: number };

    const tokens = (refreshToken: string) => ({ accessToken: 'access', refreshToken, login: 'alice', role: 1 });
    const refreshCookie = (res: request.Response) => ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith('refreshToken='));

    beforeEach(async () => {
        authService = {
            signIn: jest.fn().mockResolvedValue(tokens('rt-1')),
            refresh: jest.fn().mockResolvedValue(tokens('rt-2')),
            signOut: jest.fn().mockResolvedValue(undefined),
            refreshTtlSeconds: 7 * 24 * 60 * 60,
        };
        const password = await bcrypt.hash('secret', 4);

        const module = await Test.createTestingModule({
            imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] })],
            controllers: [AuthController],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: UserService, useValue: { getByName: jest.fn().mockResolvedValue({ id: 1, name: 'alice', password, roleId: 1 }) } },
                { provide: I18nService, useValue: { t: (key: string) => key } },
            ],
        }).compile();
        app = module.createNestApplication();
        app.use(cookieParser());
        await app.init();
    });

    afterEach(() => app.close());

    it('sign-in sets an HttpOnly, Secure, SameSite=Strict cookie and keeps the token out of the body', async () => {
        const res = await request(app.getHttpServer()).post('/sign-in').send({ login: 'alice', password: 'secret' }).expect(200);

        expect(refreshCookie(res)).toMatch(/^refreshToken=rt-1; Max-Age=604800; Path=\/; Expires=.+; HttpOnly; Secure; SameSite=Strict$/);
        expect(res.body).toEqual({ accessToken: 'access', login: 'alice', role: 1 });
    });

    it('refresh reads the token from the cookie and rotates the cookie', async () => {
        const res = await request(app.getHttpServer()).post('/refresh').set('Cookie', 'refreshToken=rt-1').expect(200);

        expect(authService.refresh).toHaveBeenCalledWith('rt-1');
        expect(refreshCookie(res)).toMatch(/^refreshToken=rt-2;/);
        expect(res.body).toEqual({ accessToken: 'access', login: 'alice', role: 1 });
    });

    it('refresh ignores a token in the body', async () => {
        await request(app.getHttpServer()).post('/refresh').send({ refreshToken: 'rt-body' }).expect(401);

        expect(authService.refresh).not.toHaveBeenCalled();
    });

    it('refresh without any token is 401 and does not reach the service', async () => {
        await request(app.getHttpServer()).post('/refresh').expect(401);

        expect(authService.refresh).not.toHaveBeenCalled();
    });

    it('refresh with a rejected token is 401 and sets no cookie', async () => {
        authService.refresh.mockRejectedValue(new UnauthorizedException());
        const res = await request(app.getHttpServer()).post('/refresh').set('Cookie', 'refreshToken=revoked').expect(401);

        expect(refreshCookie(res)).toBeUndefined();
    });

    it('sign-out revokes the cookie token, ignores the body and clears the cookie', async () => {
        const res = await request(app.getHttpServer()).post('/sign-out').set('Cookie', 'refreshToken=rt-cookie').send({ refreshToken: 'rt-body' }).expect(204);

        expect(authService.signOut).toHaveBeenCalledTimes(1);
        expect(authService.signOut).toHaveBeenCalledWith('rt-cookie');
        expect(refreshCookie(res)).toMatch(/^refreshToken=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict$/);
    });

    it('sign-out without a token is still 204', async () => {
        await request(app.getHttpServer()).post('/sign-out').expect(204);

        expect(authService.signOut).not.toHaveBeenCalled();
    });
});
