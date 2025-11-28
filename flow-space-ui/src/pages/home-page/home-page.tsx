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
            let counter = 1;
            const timer = setInterval(() => {
                const navigationItem = document.querySelector(`li[data-item-id="${path}"]`);
                if (navigationItem) {
                    const selectionResult = treeViewRef.current?.instance.selectItem(navigationItem);
                    if (selectionResult === true || counter > 50) {
                        clearInterval(timer);
                    }
                }
                counter += 1;
            }, 100);
        })();
    }, [getFlowListAsync, navigate, treeViewRef]);

    return <div className='dx-nodata'><div>{formatMessage('noDataText')}</div></div>;
};
