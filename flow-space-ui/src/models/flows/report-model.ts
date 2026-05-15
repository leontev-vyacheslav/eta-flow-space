import type { ParameterModel } from "./parameter-model";

export interface ReportModel {
    id: number;
    description: string;
    url: string;
    deviceId: number;
    settings: {
        initialParams: any;
        parameters: ParameterModel[];
    };
}