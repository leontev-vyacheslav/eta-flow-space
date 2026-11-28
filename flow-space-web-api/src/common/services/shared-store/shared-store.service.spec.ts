import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SharedStoreService } from './shared-store.service';

jest.mock('ioredis');

describe('SharedStoreService job slots', () => {
    const RedisMock = Redis as jest.MockedClass<typeof Redis>;
    let service: SharedStoreService;
    let set: jest.Mock;

    beforeEach(() => {
        set = jest.fn();
        RedisMock.mockImplementation(() => ({ set, on: jest.fn(), quit: jest.fn() }) as unknown as Redis);
        service = new SharedStoreService(new ConfigService({ redis: { host: 'isolated-test', port: 6379 } }));
        service.onModuleInit();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('uses one atomic SET with NX and an expiry, and keeps the slot after completion', async () => {
        set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
        expect(await service.claimJobSlot('weather-forecast', 60)).toBe(true);
        expect(await service.claimJobSlot('weather-forecast', 60)).toBe(false);
        expect(set).toHaveBeenNthCalledWith(1, 'job:weather-forecast:slot', '1', 'EX', 60, 'NX');
    });

    it('propagates Redis failures so callers skip polling instead of sending uncoordinated requests', async () => {
        set.mockRejectedValueOnce(new Error('Redis unavailable'));
        await expect(service.claimJobSlot('weather-forecast', 60)).rejects.toThrow('Redis unavailable');
    });
});
