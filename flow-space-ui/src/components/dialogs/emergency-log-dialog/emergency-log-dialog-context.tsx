import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getQuickGuid } from "../../../utils/uuid";
import { add, endOfDay, startOfDay } from "date-fns";
import type { EmergencyLogProps } from "../../../models/emergency-log-dialog-props";

type DateRangeModel = {
    beginDate: Date;
    endDate: Date;
}

type EmergencyLogDialogContextModel = {
    refreshToken: string;
    setRefreshToken: React.Dispatch<React.SetStateAction<string>>;

    samplingHorizon: number;
    setSamplingHorizon: React.Dispatch<React.SetStateAction<number>>;

    dateRange: DateRangeModel
    setDateRange: React.Dispatch<React.SetStateAction<DateRangeModel>>
}

const EmergencyLogDialogContext = createContext({} as EmergencyLogDialogContextModel);

function EmergencyLogDialogContextProvider(props: EmergencyLogProps) {
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const [samplingHorizon, setSamplingHorizon] = useState<number>(
        () => {
            const samplingHorizonStored = localStorage.getItem('emergencyLogSamplingHorizon');
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
        localStorage.setItem('emergencyLogSamplingHorizon', JSON.stringify(samplingHorizon));
        const rangeDates = getDateRange();
        setDateRange(rangeDates);

    }, [getDateRange, samplingHorizon]);


    return <EmergencyLogDialogContext.Provider value={{
        refreshToken,
        setRefreshToken,

        samplingHorizon,
        setSamplingHorizon,

        dateRange,
        setDateRange
    }} {...props} />
}

const useEmergencyLogDialog = () => useContext(EmergencyLogDialogContext);

export { EmergencyLogDialogContextProvider, useEmergencyLogDialog };