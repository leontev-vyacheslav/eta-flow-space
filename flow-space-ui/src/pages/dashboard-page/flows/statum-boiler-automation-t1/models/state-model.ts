import type { BoilerModel } from "./boiler-model";
import type { FlapModel } from "./flap-model";
import type { NetworkPumpModel } from "./network-pump-model";
import type { SupplyPumpModel } from "./supply-pump-model";
import type { ValveModel } from "./valve-model";

export type StateModel = {
    tempRoomAir: number;
    tempOutAir: number;
    pressGas: number;
    levelDt1: number;
    levelDt2: number;

    pressOutNet: number;
    tempOutNet: number;

    pressInNet: number;
    tempInNet: number;

    pressOutSrcW: number;

    boilers: BoilerModel[]; // 4-fold (котлы)
    boilerValves: ValveModel[]; // 4-fold (задвижки котла)

    networkPumps: NetworkPumpModel[]; // 4-fold (насосы обратки (сетевые) )
    sourceWaterPumps: NetworkPumpModel[] // 2-fold (насосы исх.воды)

    supplyPumps: SupplyPumpModel[]; // 2-fold (насосы подпитки)

    // клапаны
    flapHt: FlapModel;
    flapHn: FlapModel;
    flapDt: FlapModel;
    flapDtFill: FlapModel;
}

