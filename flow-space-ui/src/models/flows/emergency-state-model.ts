import type { EntityModel } from "../abstractions/entity-base-model";
import type { TimestampBaseModel } from "../abstractions/timestamp-base-model";
import type { DeviceStateModel } from "./device-state-model";

export type EmergencyStateModel = DeviceStateModel;

export interface EmergencyFlattenStateModel extends EntityModel, TimestampBaseModel {
    emergencyId: number;

    description: string;
}
