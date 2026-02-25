import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useDeviceStateProperties } from "./use-device-state-properties";
import type { DeviceStatePropertiesModel } from "../../../models/flows/device-state-model";
import type { GraphChartProps } from "../../../models/graph-dialog-props";
import { getQuickGuid } from "../../../utils/uuid";
import { add, endOfDay, startOfDay } from "date-fns";

type DateRangeModel = {
    beginDate: Date;
    endDate: Date;
}

type GraphDialogContextModel = {
    stateProperties: DeviceStatePropertiesModel[] | undefined;

    refreshToken: string;
    setRefreshToken: React.Dispatch<React.SetStateAction<string>>;

    samplingHorizon: number;
    setSamplingHorizon: React.Dispatch<React.SetStateAction<number>>;

    dateRange: DateRangeModel
    setDateRange: React.Dispatch<React.SetStateAction<DateRangeModel>>
}

const GraphDialogContext = createContext({} as GraphDialogContextModel);

function GraphDialogContextProvider(props: GraphChartProps) {
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const [samplingHorizon, setSamplingHorizon] = useState<number>(
        () => {
            const samplingHorizonStored = localStorage.getItem('graphChartSamplingHorizon');
            return samplingHorizonStored ? parseInt(JSON.parse(samplingHorizonStored)) : 0;
        }
    );

    const getDateRange = useCallback(() => {
        const now = new Date();
        const beginDate = props.beginDate ?? startOfDay(add(now, { days: samplingHorizon }));
        const endDate = props.endDate ?? endOfDay(now);
        return {
            beginDate: beginDate, endDate: endDate
        }
    }, [props.beginDate, props.endDate, samplingHorizon]);

    const [dateRange, setDateRange] = useState(() => {
        return getDateRange();
    });

    useEffect(() => {
        localStorage.setItem('graphChartSamplingHorizon', JSON.stringify(samplingHorizon));
        const rangeDates = getDateRange();
        setDateRange(rangeDates);

    }, [getDateRange, samplingHorizon]);

    const stateProperties = useDeviceStateProperties({ ...props, beginDate: dateRange.beginDate, endDate: dateRange.endDate, refreshToken: refreshToken });

    return <GraphDialogContext.Provider value={{
        refreshToken,
        setRefreshToken,
        stateProperties,

        samplingHorizon,
        setSamplingHorizon,

        dateRange,
        setDateRange
    }} {...props} />
}

const useGraphDialog = () => useContext(GraphDialogContext);

export { GraphDialogContextProvider, useGraphDialog };