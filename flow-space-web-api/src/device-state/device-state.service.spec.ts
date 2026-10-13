import { I18nService } from 'nestjs-i18n';
import { DeviceStateService } from './device-state.service';
import { DeviceDataModel, DeviceStateDataModel, MnemoschemaSelectorDataModel } from '../database/models';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';

describe('DeviceStateService.getDeviceStates', () => {
    const setup = (selector: { sourceDeviceId: number } | null, liveStates: Record<number, object>) => {
        const deviceModel = { findAll: jest.fn().mockResolvedValue([{ id: 7, code: 'new-boiler-room' }]) };
        const selectorModel = {
            findOne: jest.fn().mockResolvedValue(selector),
            findAll: jest.fn().mockResolvedValue([
                { deviceId: 7, device: { code: 'new-boiler-room' } },
                { deviceId: 8, device: { code: 'meter' } },
            ]),
        };
        const stateModel = { findOne: jest.fn().mockResolvedValue(null) };
        const store = { getDeviceState: jest.fn((id: number) => Promise.resolve(liveStates[id] ?? null)) };
        const service = new DeviceStateService(
            deviceModel as unknown as typeof DeviceDataModel,
            stateModel as unknown as typeof DeviceStateDataModel,
            selectorModel as unknown as typeof MnemoschemaSelectorDataModel,
            store as unknown as SharedStoreService,
            {} as I18nService,
        );

        return { service, selectorModel };
    };

    it('a device without a selector gets its live state, keyed by its code (was a 500)', async () => {
        const { service, selectorModel } = setup(null, { 7: { t: 70 } });

        const states = await service.getDeviceStates(7);

        expect(Object.keys(states)).toEqual(['new-boiler-room']);
        expect(states['new-boiler-room'].state).toEqual({ isConnected: true, t: 70 });
        expect(selectorModel.findAll).not.toHaveBeenCalled();
    });

    it('a device with a selector gets the states of every device on the diagram', async () => {
        const { service } = setup({ sourceDeviceId: 7 }, { 7: { t: 70 } });

        const states = await service.getDeviceStates(7);

        expect(Object.keys(states)).toEqual(['new-boiler-room', 'meter']);
        expect(states['new-boiler-room'].state).toEqual({ isConnected: true, t: 70 });
        expect(states['meter'].state).toEqual({ isConnected: false });
    });
});
