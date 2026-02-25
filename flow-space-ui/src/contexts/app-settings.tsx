import { createContext, useContext, useEffect, useState } from 'react';
import type { AppSettingsContextModel, AppSettingsDataContextModel } from '../models/app-settings-context';
import type { AppBaseProviderProps } from '../models/app-base-provider-props';
import type { FlowModel } from '../models/flows/flow-model';
import { useAppData } from './app-data/app-data';

const AppSettingsContext = createContext<AppSettingsContextModel>({} as AppSettingsContextModel);

const useAppSettings = () => useContext(AppSettingsContext);

function AppSettingsProvider(props: AppBaseProviderProps) {
    const { getFlowListAsync } = useAppData();
    const [flows, setFlows] = useState<FlowModel[]>();

    const [appSettingsData, setAppSettingsData] = useState<AppSettingsDataContextModel>({
        isShowFooter: true,
    });

    useEffect(() => {
        (async () => {
            const flows = await getFlowListAsync();
            if (flows) {
                setFlows(flows);
            }
        })();
    }, [getFlowListAsync]);

    useEffect(() => {
        setAppSettingsData(previous => {
            return { ...previous, workDate: new Date() };
        });

        const timer = setInterval(async () => {
            setAppSettingsData(previous => {
                return { ...previous, workDate: new Date() };
            });
        }, 60000);

        return () => {
            clearInterval(timer);
        };
    }, []);

    return <AppSettingsContext.Provider value={{
        appSettingsData,
        setAppSettingsData,
        flows
    }} {...props} />;
}

export { AppSettingsProvider, useAppSettings };
