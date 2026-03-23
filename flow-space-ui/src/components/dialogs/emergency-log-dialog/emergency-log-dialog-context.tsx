import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getQuickGuid } from "../../../utils/uuid";
import { add } from "date-fns";
import type { EmergencyLogProps } from "../../../models/emergency-log-dialog-props";
import { useAppData } from "../../../contexts/app-data/app-data";
import type { EmergencyFlattenStateModel } from "../../../models/flows/emergency-flatten-state-model";
import { v7 as uuidv7 } from 'uuid';

type DateRangeModel = {
    beginDate: Date;
    endDate: Date;
}

type EmergencyLogDialogContextModel = {
    refreshToken: string;
    setRefreshToken: React.Dispatch<React.SetStateAction<string>>;

    samplingHorizon: number;
    setSamplingHorizon: React.Dispatch<React.SetStateAction<number>>;

    dateRange: DateRangeModel;
    setDateRange: React.Dispatch<React.SetStateAction<DateRangeModel>>;

    emergencyStates: EmergencyFlattenStateModel[] | undefined;

    grouped: boolean;
    setGrouped: React.Dispatch<React.SetStateAction<boolean>>;
}

const EmergencyLogDialogContext = createContext({} as EmergencyLogDialogContextModel);

function EmergencyLogDialogContextProvider(props: EmergencyLogProps) {
    const { getEmergencyStatesByDatesAsync } = useAppData();
    const [emergencyStates, setEmergencyStates] = useState<EmergencyFlattenStateModel[] | undefined>();
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const [samplingHorizon, setSamplingHorizon] = useState<number>(
        () => {
            const samplingHorizonStored = localStorage.getItem('emergencyLogSamplingHorizon');
            return samplingHorizonStored ? parseInt(JSON.parse(samplingHorizonStored)) : -1;
        }
    );
    const [grouped, setGrouped] = useState<boolean>(false);

    const getDateRange = useCallback(() => {
        const now = new Date();
        const beginDate = props.beginDate ?? add(now, { hours: samplingHorizon });
        const endDate = props.endDate ?? now;
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

        (async () => {
            const emergencyStates = await getEmergencyStatesByDatesAsync(
                props.device?.id,
                props.beginDate ?? rangeDates.beginDate,
                props.endDate ?? rangeDates.endDate
            );
            setEmergencyStates(emergencyStates?.flatMap(({ id, deviceName, state, createdAt }) =>
                state.reasons.map(({ id: emergencyId, description }: any) => ({
                    id: uuidv7(),
                    emergencyStateId: id,
                    deviceName,
                    emergencyId,
                    description,
                    createdAt
                }))
            ));
        })();

    }, [getDateRange, getEmergencyStatesByDatesAsync, props, samplingHorizon, refreshToken]);


    return <EmergencyLogDialogContext.Provider value={{
        refreshToken,
        setRefreshToken,

        samplingHorizon,
        setSamplingHorizon,

        dateRange,
        setDateRange,
        emergencyStates,

        grouped,
        setGrouped
    }} {...props} />
}

const useEmergencyLogDialog = () => useContext(EmergencyLogDialogContext);

export { EmergencyLogDialogContextProvider, useEmergencyLogDialog };