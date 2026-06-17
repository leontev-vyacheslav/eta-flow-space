import { Test, TestingModule } from '@nestjs/testing';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { I18nService } from 'nestjs-i18n';

describe('DeviceController', () => {
    let controller: DeviceController;
    let deviceService: jest.Mocked<DeviceService>;

    const mockDevice = {
        id: 1,
        code: 'DEV-001',
        name: 'Test Device',
        description: 'A test device',
        flowId: 1,
        objectLocationId: 1,
        settings: {},
        updateStateInterval: 30,
        lastStateUpdate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DeviceController],
            providers: [
                {
                    provide: DeviceService,
                    useValue: {
                        getDevices: jest.fn().mockResolvedValue([mockDevice]),
                        getDevice: jest.fn().mockResolvedValue(mockDevice),
                    },
                },
                {
                    provide: I18nService,
                    useValue: {
                        t: jest.fn().mockReturnValue('translated'),
                    },
                },
                {
                    provide: 'CACHE_MANAGER',
                    useValue: {},
                },
            ],
        }).compile();

        controller = module.get<DeviceController>(DeviceController);
        deviceService = module.get(DeviceService);
    });

    it('should return devices for the authenticated user', async () => {
        const mockUser = { userId: 1, roleId: 1 };

        const result = await controller.getDevices(mockUser);

        expect(result).toEqual([mockDevice]);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(deviceService.getDevices).toHaveBeenCalledTimes(1);
        expect(deviceService.getDevices.mock.calls[0][0]).toBe(1);
    });
});
