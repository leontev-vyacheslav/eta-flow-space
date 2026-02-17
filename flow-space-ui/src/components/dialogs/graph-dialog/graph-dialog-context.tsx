import { createContext, useContext, useState } from "react";
import { useDeviceStateProperties } from "./use-device-state-properties";
import type { DeviceStatePropertiesModel } from "../../../models/flows/device-state-model";
import type { GraphChartProps } from "../../../models/graph-dialog-props";
import { getQuickGuid } from "../../../utils/uuid";
type GraphDialogContextModel = {
    stateProperties: DeviceStatePropertiesModel[] | undefined,
    setRefreshToken:  React.Dispatch<React.SetStateAction<string>>;
}

const GraphDialogContext = createContext({} as GraphDialogContextModel);

function GraphDialogContextProvider(props: GraphChartProps) {
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const stateProperties = useDeviceStateProperties({...props, refreshToken: refreshToken});

    return <GraphDialogContext.Provider value={{
        stateProperties,
        setRefreshToken
    }} {...props} />
}

const useGraphDialog = () => useContext(GraphDialogContext);

export { GraphDialogContextProvider, useGraphDialog };