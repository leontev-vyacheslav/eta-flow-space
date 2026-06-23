import { useEffect } from 'react';
import { useAppData } from './app-data/app-data';
import { useAppSettingsStore } from './app-settings-store';
import { selectUser } from './auth-selectors';
import { useAuthStore } from './auth-store';

export function AppSettingsInitializer() {
    const user = useAuthStore(selectUser);
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