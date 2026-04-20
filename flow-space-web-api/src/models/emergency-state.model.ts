export interface EmergencyStateModel {
    deviceId: number;
    state: Record<string, unknown>;
    [key: number]: never; // satisfies index signature
}
