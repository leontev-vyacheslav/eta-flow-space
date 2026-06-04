import { useEffect } from 'react';
import { useAppData } from './app-data/app-data';
import { useAuth } from './auth';
import { useAppSettingsStore } from './app-settings-store';

export function AppSettingsInitializer() {
    const { user } = useAuth();
    const { getFlowListAsync, getUserSettingsAsync } = useAppData();
    const { setFlows, setAppSettingsData } = useAppSettingsStore();

    useEffect(() => {
        (async () => {
            const flows = await getFlowListAsync();
            if (flows) {
                setFlows(flows);
            }
            const userSettings = await getUserSettingsAsync();
            if (userSettings) {
                setAppSettingsData({ userSettings });
            }
        })();
    }, [getFlowListAsync, getUserSettingsAsync, setAppSettingsData, setFlows, user]);

    return null;
}