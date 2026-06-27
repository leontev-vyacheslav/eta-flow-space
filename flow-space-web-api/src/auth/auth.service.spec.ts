import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';

describe('AuthService', () => {
    let service: AuthService;
    let jwtService: jest.Mocked<JwtService>;
    let sharedStoreService: jest.Mocked<SharedStoreService>;

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
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jwtService = module.get(JwtService);
        sharedStoreService = module.get(SharedStoreService);
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
            login: '',
            role: 1,
        });
    });

    it('should reject refresh with invalid token', async () => {
        jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

        await expect(service.refresh('bad-token')).rejects.toThrow();
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
});
