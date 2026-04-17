export interface DeviceStateResponseModel {
    values: {
        id: number;
        deviceId: number;
        state: Record<string, unknown> & { isConnected: boolean };
        createdAt: Date;
        updatedAt: Date;
    };
}
