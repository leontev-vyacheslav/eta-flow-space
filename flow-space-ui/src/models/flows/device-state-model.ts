import type { EntityModel } from "../abstractions/entity-base-model";
import type { TimestampBaseModel } from "../abstractions/timestamp-base-model";

export interface DeviceStateModel extends EntityModel, TimestampBaseModel {
    deviceId: number;

    state: any;
}

export interface DeviceStatePropertiesModel extends EntityModel, TimestampBaseModel, Record<string, any> {
    deviceId: number;
}