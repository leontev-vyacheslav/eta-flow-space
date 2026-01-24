import type { NetworkPumpAlarm } from "./enums/network-pump-alarm";
import type { NetworkPumpStatus } from "./enums/network-pump-status";
import type { VariableFrequencyDriveAlarm } from "./enums/variable-frequency-drive-alarm";
import type { VariableFrequencyDriveStatus } from "./enums/variable-frequency-drive-status";
import type { WorkMode } from "./enums/work-modes";

/**
 * Модель сетевого насоса
 */
export type NetworkPumpModel = {
    setPower: number;
    mode: WorkMode;
    status: NetworkPumpStatus;
    alarm: NetworkPumpAlarm;
    modeFc: WorkMode;
    statusFc: VariableFrequencyDriveStatus;
    alarmFc: VariableFrequencyDriveAlarm;
}


