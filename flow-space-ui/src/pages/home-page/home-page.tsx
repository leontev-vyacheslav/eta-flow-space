import { useEffect } from 'react';
import { formatMessage } from 'devextreme/localization';
import { useAppData } from '../../contexts/app-data/app-data';
import { useNavigate } from 'react-router';
import { useSharedArea } from '../../contexts/shared-area';

export const HomePage = () => {
    const { getFlowListAsync } = useAppData();
    const navigate = useNavigate();
    const { treeViewRef } = useSharedArea();

    useEffect(() => {
        (async () => {
            const flows = await getFlowListAsync();
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
            navigate(path, { replace: true });
        })();
    }, [getFlowListAsync, navigate, treeViewRef]);

    return <div className='dx-widget dx-nodata' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}><div>{formatMessage('noDataText')}</div></div>;
};
