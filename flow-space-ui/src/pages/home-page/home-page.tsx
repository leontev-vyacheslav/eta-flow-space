import { useEffect } from 'react';
import { formatMessage } from 'devextreme/localization';
import { useNavigate } from 'react-router';
import { useSharedArea } from '../../contexts/shared-area';
import { useAppSettingsStore } from '../../contexts/app-settings-store';

export const HomePage = () => {
    const flows = useAppSettingsStore((s) => s.flows);
    const navigate = useNavigate();
    const { treeViewRef } = useSharedArea();

    useEffect(() => {
            if (!flows) {
                return;
            }
            const flow = flows.find(() => true)
            if (!flow) {
                return;
            }
            const device = flow.devices.find(() => true);
            if (!device) {
                return;
            }
            const path = `/${flow.code}/device/${device.id}`;
            const lastNavigationPath = localStorage.getItem('lastNavigationPath');

            navigate(lastNavigationPath ? lastNavigationPath : path, { replace: true });
    }, [flows, navigate, treeViewRef]);

    return <div className='dx-widget dx-nodata' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><div>{formatMessage('noDataText')}</div></div>;
};
