export type DeviceStateModel = {
    tempRoomAir: number;
    tempOutAir: number;
    pressGas: number;
    levelDT1: number;
    levelDT2: number;

    // modeVDT: boolean;
    // modeVFillDT: boolean;   // ???

    pressOutNet: number;
    tempOutNet: number;

    pressInNet: number;
    tempInNet: number;

    pressOutSrcW: number;

    boilers: BoilerModel[]; // 4-fold (котлы)
    boilerValves: ValveModel[]; // 4-fold (задвижки котла)

    inputPumps: PumpModel[]; // 4-fold (насосы обратки)
    sourceWaterPumps: PumpModel[] // 2-fold (насосы исх.воды)
    supplyPumps: BaseStateModel[]; // 2-fold (насосы подпитки)

    flapVht: FlapModel;
    flapVhn: FlapModel;
    flapVdt: FlapModel;
    flapVdtFill: FlapModel;
}

export type BaseStateModel = {
    mode: boolean;
    status: boolean;
    alarm: boolean;
}

export type BoilerModel = {
    powerBurner: number;
} & BaseStateModel;


export type PumpModel = {
    setPower: boolean;
    modeFc: boolean;
    statusFc: boolean;
    alarmFc: boolean;
} & BaseStateModel;

export type ValveModel = {
    status: boolean;
}

export type FlapModel = {
    mode: boolean;
}


