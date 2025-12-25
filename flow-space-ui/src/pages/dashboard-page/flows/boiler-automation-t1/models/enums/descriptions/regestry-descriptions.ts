import { BoilerAlarmDescriptions } from "./boiler-alarm-descriptions";
import { BoilerStatusDescriptions } from "./boiler-status-descriptions";
import { FlapModeDescriptions } from "./flap-mode-descriptions";
import { NetworkPumpAlarmDescriptions } from "./network-pump-alarm-descriptions";
import { NetworkPumpStatusDescriptions } from "./network-pump-status-descriptions";
import { SupplyPumpAlarmDescriptions } from "./supply-pump-alarm-descriptions";
import { SupplyPumpStatusDescriptions } from "./supply-pump-status-descriptions";
import { ValveStatusDescriptions } from "./valve-status-descriptions";
import { VariableFrequencyDriveAlarmDescriptions } from "./variable-frequency-drive-alarm-descriptions";
import { VariableFrequencyDriveStatusDescriptions } from "./variable-frequency-drive-status-descriptions";
import { WorkModeDescriptions } from "./work-mode-descriptions";

export type DescriptionObject = Record<number | string, string>;

export const RegestryDescriptions: Record<string, DescriptionObject> = {
    BoilerAlarmDescriptions,
    BoilerStatusDescriptions,
    FlapModeDescriptions,
    NetworkPumpAlarmDescriptions,
    NetworkPumpStatusDescriptions,
    SupplyPumpAlarmDescriptions,
    SupplyPumpStatusDescriptions,
    ValveStatusDescriptions,
    VariableFrequencyDriveAlarmDescriptions,
    VariableFrequencyDriveStatusDescriptions,
    WorkModeDescriptions,
} as const;