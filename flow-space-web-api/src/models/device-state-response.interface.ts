export interface DeviceStateResponse {
    values: {
        id: number;
        deviceId: number;
        state: Record<string, unknown> & { isConnected: boolean };
        createdAt: Date;
        updatedAt: Date;
    };
}
