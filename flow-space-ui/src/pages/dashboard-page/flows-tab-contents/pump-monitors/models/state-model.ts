export type StateModel = {
    startStop: boolean;

    lowLevel: boolean;

    midLevel: boolean;

    hiLevel: boolean;

    emergencyLevel: boolean;

    statePump1: boolean;

    statePump2: boolean;

    resetFaultPump1: boolean;

    resetFaultPump2: boolean;

    resetOperatingTimePump1: boolean;

    resetOperatingTimePump2: boolean;

    faultPump1: boolean;

    faultPump2: boolean;

    timePump1: number;

    timePump2: number;
}
