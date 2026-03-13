import type { EmergencyReasonModel } from "./emergency-reason-model";

export type EmergencyModel = {
    deviceId: number;
    reasons: EmergencyReasonModel[];
    timestamp: number;
};
