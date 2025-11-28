import type { EntityModel } from "../abstractions/entity-base-model";
import type { TimestampBaseModel } from "../abstractions/timestamp-base-model";

export interface ObjectLocationModel extends EntityModel, TimestampBaseModel {
    address: string;

    latitude: number;

    longitude: number;
}