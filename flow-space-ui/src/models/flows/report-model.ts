import type { ParameterModel } from "./parameter-model";

export interface ReportModel {
    id: string;
    description: string;
    url: string;

    parameters: ParameterModel[];
}