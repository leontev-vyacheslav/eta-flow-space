import type { ReportModel } from "./report-model";

export interface DeviceSettingsModel {
  stateTtl: number;
  reports?: ReportModel[];
}
