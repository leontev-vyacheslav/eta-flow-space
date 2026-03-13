import type { EntityModel } from "../abstractions/entity-base-model";
import type { TimestampBaseModel } from "../abstractions/timestamp-base-model";


export interface EmergencyFlattenStateModel extends EntityModel, TimestampBaseModel {
    emergencyStateId: number;

    deviceName: string;

    emergencyId: number;

    description: string;
}
