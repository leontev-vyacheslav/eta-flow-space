import { DeviceService } from './device.service';
import { DeviceDataModel, MnemoschemaSelectorDataModel } from '../database/models';

describe('DeviceService.getDevice', () => {
    const own = { id: 7, code: 'new-boiler-room', name: 'New', description: 'New boiler room' };

    const setup = (selector: { sourceDeviceId: number } | null, selectorRows: { device: object }[] = []) => {
        const deviceModel = {
            findByPk: jest.fn().mockResolvedValue({
                ...own,
                flow: null,
                objectLocation: null,
                reports: [],
                mnemoschemaSelector: selector ? { sourceDevice: { code: 'source-boiler-room' } } : null,
            }),
            findAll: jest.fn().mockResolvedValue([own]),
        };
        const selectorModel = {
            findOne: jest.fn().mockResolvedValue(selector),
            findAll: jest.fn().mockResolvedValue(selectorRows),
        };
        const service = new DeviceService(deviceModel as unknown as typeof DeviceDataModel, selectorModel as unknown as typeof MnemoschemaSelectorDataModel);

        return { service, selectorModel };
    };

    it('a device without a diagram selector uses its own diagram (was a 500)', async () => {
        const { service, selectorModel } = setup(null);

        const device = (await service.getDevice(7)) as unknown as { mnemoschemaCode: string; linkedDevices: object[] };

        expect(device.mnemoschemaCode).toBe('new-boiler-room');
        expect(device.linkedDevices).toEqual([own]);
        expect(selectorModel.findAll).not.toHaveBeenCalled();
    });

    it('a device with a selector uses the source device diagram and lists every device on it', async () => {
        const other = { id: 8, code: 'meter', name: 'Meter', description: 'Heat meter' };
        const { service } = setup({ sourceDeviceId: 3 }, [{ device: own }, { device: other }]);

        const device = (await service.getDevice(7)) as unknown as { mnemoschemaCode: string; linkedDevices: object[] };

        expect(device.mnemoschemaCode).toBe('source-boiler-room');
        expect(device.linkedDevices).toEqual([own, other]);
    });
});
