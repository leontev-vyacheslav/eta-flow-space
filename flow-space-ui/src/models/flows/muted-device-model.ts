import type { MutedReasonModel } from "./muted-reason-model";

export interface MutedDeviceModel {
    id: number;
    muteReasonItems: MutedReasonModel[];
}
