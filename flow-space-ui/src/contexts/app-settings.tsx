import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { AppSettingsContextModel, AppSettingsDataContextModel } from '../models/app-settings-context';
import type { AppBaseProviderProps } from '../models/app-base-provider-props';
import type { FlowModel } from '../models/flows/flow-model';
import { useAppData } from './app-data/app-data';
import { useAuth } from './auth';


const AppSettingsContext = createContext<AppSettingsContextModel>({} as AppSettingsContextModel);

const useAppSettings = () => useContext(AppSettingsContext);

function AppSettingsProvider(props: AppBaseProviderProps) {
    const { user } = useAuth();
    const { getFlowListAsync, getUserSettingsAsync } = useAppData();
    const [flows, setFlows] = useState<FlowModel[] | undefined>([]);
    const [appSettingsData, setAppSettingsData] = useState<AppSettingsDataContextModel>({
        isShowFooter: true,
    });

    useEffect(() => {
        (async () => {
            const flows = await getFlowListAsync();
            setFlows(flows);
            const userSettings = await getUserSettingsAsync();
            if (userSettings) {
                setAppSettingsData(p => ({ ...p, userSettings }));
            }
        })();
    }, [getFlowListAsync, getUserSettingsAsync, user]);


    return <AppSettingsContext.Provider value={{
        appSettingsData,
        setAppSettingsData,
        flows,
    }} {...props} />;
}

export { AppSettingsProvider, useAppSettings };
