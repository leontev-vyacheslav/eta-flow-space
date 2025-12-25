import type { BoilerAlarm } from "./enums/boiler-alarm";
import type { BoilerStatus } from "./enums/boiler-status";
import type { WorkMode } from "./enums/work-modes";

/**
 * Модель котла
 */
export type BoilerModel = {
    powerBurner: number;
    mode: WorkMode;
    status: BoilerStatus;
    alarm: BoilerAlarm;
}


