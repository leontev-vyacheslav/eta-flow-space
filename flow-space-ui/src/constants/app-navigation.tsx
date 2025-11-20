import { useEffect, useMemo, useState } from 'react';
import {
    AboutIcon,
    ExitIcon,
    HomeIcon,
    HelpIcon,
    FlowIcon,
    DeviceIcon
} from './app-icons';
import type { TreeViewItemModel } from '../models/tree-view-item';
import type { IconBaseProps } from 'react-icons';
import { useAppData } from '../contexts/app-data/app-data';
import type { FlowModel } from '../models/flows/flow-model';

export const useSideNavigationMenuItems = () => {
    const { getFlowListAsync } = useAppData();
    const [flows, setFlows] = useState<FlowModel[]>();

    useEffect(() => {
        (async () => {
            const flows = await getFlowListAsync();
            if (flows) {
                setFlows(flows);
            }
        })();
    }, [getFlowListAsync]);

    return useMemo<TreeViewItemModel[]>(() => {
        return [
            {
                id: 'home',
                text: 'Главная',
                iconRender: (props: IconBaseProps) => <HomeIcon size={22} {...props} />,
                path: '/',
            },
            ...(flows?.map(f => ({
                id: f.code,
                text: f.name,
                iconRender: (props: IconBaseProps) => <FlowIcon size={22} {...props} />,
                items: f.devices.map(d => ({
                    id: d.code,
                    text: d.name,
                    iconRender: (props: IconBaseProps) =>  <DeviceIcon size={22} {...props}/>,
                    path: `/${f.uid}/device/${d.id}`,
                }))
            })) || []),
            {
                id: 'about',
                text: 'О программе',
                iconRender: (props: IconBaseProps) => <AboutIcon size={22} {...props} />,
                path: '/about',
            },
            {
                id: 'help',
                text: ' Справка',
                iconRender: (props: IconBaseProps) => <HelpIcon size={22} {...props} />,
                command: 'help',
            },
            {
                id: 'exit',
                text: 'Выход',
                iconRender: (props: IconBaseProps) => <ExitIcon size={22} {...props} />,
                command: 'exit',
            },
        ] as TreeViewItemModel[];
    }, [flows]);
};
