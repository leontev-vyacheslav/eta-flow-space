import moment from 'moment';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppSettingsContextModel, AppSettingsDataContextModel } from '../models/app-settings-context';
import type { AppBaseProviderProps } from '../models/app-base-provider-props';

const AppSettingsContext = createContext<AppSettingsContextModel>({} as AppSettingsContextModel);

const useAppSettings = () => useContext(AppSettingsContext);

function AppSettingsProvider(props: AppBaseProviderProps) {


    const [appSettingsData, setAppSettingsData] = useState<AppSettingsDataContextModel>({
        isShowFooter: true,
    });

    const updateWorkDateAsync = useCallback(async () => {
        const rtcDateTime =new Date();
        if (rtcDateTime) {
            setAppSettingsData(previous => {
                return { ...previous, workDate: rtcDateTime };
            });
        }
    }, []);

    useEffect(() => {
        (async () => {
            await updateWorkDateAsync();
        })();
    }, [updateWorkDateAsync]);

    useEffect(() => {
        const rtcIntervalTimer = setInterval(async () => {
            await updateWorkDateAsync();
        }, 60000 * 10);


        const intervalTimer = setInterval(async () => {
            setAppSettingsData(previous => {
                const workDate = moment(previous.workDate).add(60, 'seconds');

                return { ...previous, workDate: workDate.toDate() };
            });
        }, 60000);

        return () => {
            clearInterval(rtcIntervalTimer);
            clearInterval(intervalTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <AppSettingsContext.Provider value={ {
        appSettingsData,
        setAppSettingsData,
        updateWorkDateAsync,
       } } { ...props } />;
}

export { AppSettingsProvider, useAppSettings };
