import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';
import { UserService } from '../user/user.service';

describe('AuthService', () => {
    let service: AuthService;
    let jwtService: jest.Mocked<JwtService>;
    let sharedStoreService: jest.Mocked<SharedStoreService>;
    let userService: { getById: jest.Mock };

    const mockJwtConfig = {
        secret: 'test-secret',
        refreshSecret: 'test-refresh-secret',
        expiresIn: '15m',
        refreshExpiresIn: '7d',
        algorithm: 'HS256',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: JwtService,
                    useValue: {
                        signAsync: jest.fn().mockResolvedValue('mock-token'),
                        verifyAsync: jest.fn(),
                    },
                },
                {
                    provide: I18nService,
                    useValue: {
                        t: jest.fn().mockReturnValue('translated'),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue(mockJwtConfig),
                    },
                },
                {
                    provide: SharedStoreService,
                    useValue: {
                        saveRefreshToken: jest.fn().mockResolvedValue(undefined),
                        getRefreshTokenUserId: jest.fn(),
                        deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: UserService,
                    useValue: {
                        getById: jest.fn().mockResolvedValue({ id: 1, name: 'alice', roleId: 1 }),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jwtService = module.get(JwtService);
        sharedStoreService = module.get(SharedStoreService);
        userService = module.get(UserService);
    });

    it('should generate both access and refresh tokens on signIn', async () => {
        jwtService.signAsync.mockResolvedValueOnce('access-token').mockResolvedValueOnce('refresh-token');

        const result = await service.signIn({
            login: 'testuser',
            userId: 1,
            roleId: 1,
        });

        expect(result).toEqual({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            login: 'testuser',
            role: 1,
        });
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(sharedStoreService.saveRefreshToken).toHaveBeenCalledWith('refresh-token', 1, 604800);
    });

    it('should rotate tokens on refresh', async () => {
        sharedStoreService.getRefreshTokenUserId.mockResolvedValue(1);
        jwtService.verifyAsync.mockResolvedValue({
            userId: 1,
            roleId: 1,
            type: 'refresh',
        });
        jwtService.signAsync.mockResolvedValueOnce('new-access-token').mockResolvedValueOnce('new-refresh-token');

        const result = await service.refresh('old-refresh-token');

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(sharedStoreService.deleteRefreshToken).toHaveBeenCalledWith('old-refresh-token');
        expect(result).toEqual({
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
            login: 'alice',
            role: 1,
        });
    });

    it('should reject refresh and revoke the token when the user no longer exists', async () => {
        sharedStoreService.getRefreshTokenUserId.mockResolvedValue(1);
        jwtService.verifyAsync.mockResolvedValue({ userId: 1, roleId: 1, type: 'refresh' });
        userService.getById.mockResolvedValue(null);

        await expect(service.refresh('deleted-user-token')).rejects.toThrow();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(sharedStoreService.deleteRefreshToken).toHaveBeenCalledWith('deleted-user-token');
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(sharedStoreService.saveRefreshToken).not.toHaveBeenCalled();
    });

    it('should take the role from the database on refresh, not from the old token', async () => {
        sharedStoreService.getRefreshTokenUserId.mockResolvedValue(1);
        jwtService.verifyAsync.mockResolvedValue({ userId: 1, roleId: 1, type: 'refresh' });
        userService.getById.mockResolvedValue({ id: 1, name: 'alice', roleId: 2 });

        const result = await service.refresh('old-refresh-token');

        expect(result.role).toBe(2);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(jwtService.signAsync).toHaveBeenCalledWith(expect.objectContaining({ roleId: 2, type: 'refresh' }), expect.anything());
    });

    it('should reject refresh with invalid token', async () => {
        jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

        await expect(service.refresh('bad-token')).rejects.toThrow();
    });

    it('should revoke the refresh token on signOut', async () => {
        await service.signOut('refresh-token');

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(sharedStoreService.deleteRefreshToken).toHaveBeenCalledWith('refresh-token');
    });

    it('should reject refresh after signOut', async () => {
        const store = new Map<string, number>([['refresh-token', 1]]);
        sharedStoreService.getRefreshTokenUserId.mockImplementation((token: string) => Promise.resolve(store.get(token) ?? null));
        sharedStoreService.deleteRefreshToken.mockImplementation((token: string) => {
            store.delete(token);
            return Promise.resolve();
        });
        jwtService.verifyAsync.mockResolvedValue({
            userId: 1,
            roleId: 1,
            type: 'refresh',
        });

        await service.signOut('refresh-token');

        await expect(service.refresh('refresh-token')).rejects.toThrow();
    });

    it('should reject refresh when token not in Redis', async () => {
        jwtService.verifyAsync.mockResolvedValue({
            userId: 1,
            roleId: 1,
            type: 'refresh',
        });
        sharedStoreService.getRefreshTokenUserId.mockResolvedValue(null);

        await expect(service.refresh('expired-token')).rejects.toThrow();
    });

    it('should issue different refresh tokens for the same user in the same second (jti)', async () => {
        const realJwt = new JwtService({ secret: 'test-secret' });
        const module = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: JwtService, useValue: realJwt },
                { provide: I18nService, useValue: { t: jest.fn() } },
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(mockJwtConfig) } },
                { provide: SharedStoreService, useValue: { saveRefreshToken: jest.fn() } },
                { provide: UserService, useValue: { getById: jest.fn() } },
            ],
        }).compile();
        const realService = module.get(AuthService);

        const [first, second] = await Promise.all([
            realService.signIn({ login: 'alice', userId: 1, roleId: 1 }),
            realService.signIn({ login: 'alice', userId: 1, roleId: 1 }),
        ]);
        const payload = realJwt.decode<{ jti?: string; iat: number }>(first.refreshToken);

        expect(first.refreshToken).not.toBe(second.refreshToken);
        expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
        expect(payload.iat).toBe(realJwt.decode<{ iat: number }>(second.refreshToken).iat);
    });
});
