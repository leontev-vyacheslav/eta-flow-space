import type { SupplyPumpAlarm } from "./enums/supply-pump-alarm";
import type { SupplyPumpStatus } from "./enums/supply-pump-status";
import type { WorkMode } from "./enums/work-modes";

/**
 * Модель насоса подпитки
 */
export type SupplyPumpModel = {
    mode: WorkMode;
    status: SupplyPumpStatus;
    alarm: SupplyPumpAlarm;
}


