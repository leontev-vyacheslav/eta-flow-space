import type { DescriptiveBaseModel } from "../abstractions/descriptive-base-model";
import type { EntityModel } from "../abstractions/entity-base-model";
import type { TimestampBaseModel } from "../abstractions/timestamp-base-model";
import type { FlowModel } from "./flow-model";
import type { ObjectLocationModel } from "./object-location-model";

export interface DeviceModel extends EntityModel, DescriptiveBaseModel, TimestampBaseModel {
    flowId: number;

    settings: object;

    updateStateInterval: number;

    lastStateUpdate: Date;

    flow?: FlowModel;

    objectLocation?: ObjectLocationModel;
}