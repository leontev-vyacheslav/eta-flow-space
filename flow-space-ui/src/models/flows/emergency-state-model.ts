import type { EntityModel } from "../abstractions/entity-base-model";
import type { TimestampBaseModel } from "../abstractions/timestamp-base-model";
import type { DeviceStateModel } from "./device-state-model";

export type EmergencyStateModel = DeviceStateModel &
{
    deviceName: string;
};

export interface EmergencyFlattenStateModel extends EntityModel, TimestampBaseModel {
    emergencyStateId: number,

    deviceName: string;

    emergencyId: number;

    description: string;
}
