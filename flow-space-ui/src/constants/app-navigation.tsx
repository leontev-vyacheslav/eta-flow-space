import { useMemo } from 'react';
import {
    AboutIcon,
    ExitIcon,
    HelpIcon,
    FlowIcon,
    DeviceIcon
} from './app-icons';
import type { TreeViewItemModel } from '../models/tree-view-item';
import type { IconBaseProps } from 'react-icons';
import { useAppSettings } from '../contexts/app-settings';

export const useSideNavigationMenuItems = () => {
    const { flows } = useAppSettings();

    return useMemo<TreeViewItemModel[]>(() => {
        return [
            ...(flows?.map(f => ({
                id: f.code,
                text: f.name,
                iconRender: (props: IconBaseProps) => <FlowIcon size={22} {...props} />,
                entity: { typeName: 'FlowModel', id: f.id },
                items: f.devices.map(d => ({
                    id: d.code,
                    text: d.name,
                    iconRender: (props: IconBaseProps) => <DeviceIcon size={22} {...props} />,
                    path: `/${f.code}/device/${d.id}`,
                    entity: { typeName: 'DeviceModel', id: d.id },
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
