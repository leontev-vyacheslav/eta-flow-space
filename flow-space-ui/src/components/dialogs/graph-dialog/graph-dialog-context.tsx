import { createContext, useContext, useEffect, useState } from "react";
import { useDeviceStateProperties } from "./use-device-state-properties";
import type { DeviceStatePropertiesModel } from "../../../models/flows/device-state-model";
import type { GraphChartProps } from "../../../models/graph-dialog-props";
import { getQuickGuid } from "../../../utils/uuid";

type GraphDialogContextModel = {
    refreshToken: string;
    setRefreshToken: React.Dispatch<React.SetStateAction<string>>;
    stateProperties: DeviceStatePropertiesModel[] | undefined;
    samplingHorizon: number;
    setSamplingHorizon: React.Dispatch<React.SetStateAction<number>>;
}

const GraphDialogContext = createContext({} as GraphDialogContextModel);

function GraphDialogContextProvider(props: GraphChartProps) {
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const [samplingHorizon, setSamplingHorizon] = useState<number>(
        () => {
            const samplingHorizonStored = localStorage.getItem('graphdialog_samplingHorizon');
            return samplingHorizonStored ? parseInt(JSON.parse(samplingHorizonStored)) : 0;
        }
    );

    useEffect(() => {
        localStorage.setItem('graphdialog_samplingHorizon', JSON.stringify(samplingHorizon));
    }, [samplingHorizon]);

    const stateProperties = useDeviceStateProperties({ ...props, samplingHorizon: samplingHorizon, refreshToken: refreshToken });

    return <GraphDialogContext.Provider value={{
        refreshToken,
        setRefreshToken,
        stateProperties,
        samplingHorizon,
        setSamplingHorizon
    }} {...props} />
}

const useGraphDialog = () => useContext(GraphDialogContext);

export { GraphDialogContextProvider, useGraphDialog };