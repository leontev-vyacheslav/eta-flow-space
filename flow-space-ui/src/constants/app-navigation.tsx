import { useMemo } from 'react';
import {
    AboutIcon,
    ExitIcon,
    HelpIcon,
    FlowIcon,
    DeviceIcon,
    WarningLogIcon,
    MapIcon,
    LocationIcon,
    LocationAllIcon,
    ReportIcon,
    BetaIcon,
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
                    id: `${f.code}/device/${d.id}`,
                    text: d.name,
                    iconRender: (props: IconBaseProps) => <DeviceIcon size={22} {...props} />,
                    path: `/${f.code}/device/${d.id}`,
                    entity: { typeName: 'DeviceModel', id: d.id },
                }))
            })) || []),
            {
                //id: 'map',
                id: '/map',
                text: 'Карта объектов',

                iconRender: (props: IconBaseProps) => <MapIcon size={22} {...props} />,
                items: [{
                    id: 'map-only',
                    text: 'Все объекты',
                    iconRender: (props: IconBaseProps) => <LocationAllIcon size={22} {...props} />,
                    path: '/map',
                }, ...(flows?.flatMap(f => f.devices.map((d: any) => ({ ...d, flowCode: f.code })))
                    .map((d: any) => ({
                        id: `/map/${d.flowCode}/device/${d.id}`,
                        text: d.name,
                        iconRender: (props: IconBaseProps) => <LocationIcon size={22} {...props} />,
                        entity: { typeName: 'DeviceModel', id: d.id },
                        path: `/map/${d.flowCode}/device/${d.id}`,
                    })) || []),]
            },
            {
                id: 'emergency-log',
                text: 'Журнал аварий',
                iconRender: (props: IconBaseProps) => <WarningLogIcon size={20} {...props} />,
                command: 'emergency-log',
            },
            {
                id: 'reports',
                text: 'Отчеты',
                iconRender: (props: IconBaseProps) => <ReportIcon size={20} {...props} />,
               items: [
                    {
                        id: '/reports/emergency-summary-report',
                        text: 'Аварийные ситуации',
                        iconRender: (props: IconBaseProps) => <div style={{position: 'relative'}}><WarningLogIcon size={20} {...props} ></WarningLogIcon> <BetaIcon size={12} {...props} style={{position: 'absolute', top: '-5px', right: '-5px'}} /></div>,
                        path: '/reports/emergency-summary-report',
                    },
                ]
            },
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
