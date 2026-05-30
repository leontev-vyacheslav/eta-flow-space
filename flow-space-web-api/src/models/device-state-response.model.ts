import { DeviceStateDataModel } from '../database/models';

export interface DeviceStateResponseModel {
    values: {
        id: number;
        deviceId: number;
        state: Record<string, unknown> & { isConnected: boolean };
        createdAt: Date;
        updatedAt: Date;
    };
}

export interface DeviceStatesResponseModel {
    values: DeviceStateDataModel[];
}
