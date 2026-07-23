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
    SummaryReportIcon,
    FlowDevicesGroupIcon,
} from './app-icons';
import type { TreeViewItemModel } from '../models/tree-view-item';
import type { IconBaseProps } from 'react-icons';
import { useAppSettingsStore } from '../contexts/app-settings-store';

export const useSideNavigationMenuItems = () => {
    const flows = useAppSettingsStore((s) => s.flows);

    return useMemo<TreeViewItemModel[]>(() => {
        return [
            {
                id: 'objects',
                text: 'Объекты',
                iconRender: (props: IconBaseProps) => <FlowIcon size={22} {...props} />,
                items: flows?.flatMap<TreeViewItemModel>(f => {
                    if (f.devices.length === 1) {
                        const d = f.devices[0] as any;
                        return [{
                            id: `${f.code}/device/${d.id}`,
                            text: d.name,
                            iconRender: (props: IconBaseProps) => <DeviceIcon size={22} {...props} />,
                            path: `/${f.code}/device/${d.id}`,
                            entity: { typeName: 'DeviceModel', id: d.id },
                        }];
                    }
                    return [{
                        id: `flow/${f.code}`,
                        text: `${f.name} (${f.devices.length})`,
                        iconRender: (props: IconBaseProps) => <FlowDevicesGroupIcon size={22} {...props} />,
                        expanded: true,
                        items: f.devices.map((d: any) => ({
                            id: `${f.code}/device/${d.id}`,
                            text: d.name,
                            iconRender: (props: IconBaseProps) => <DeviceIcon size={22} {...props} />,
                            path: `/${f.code}/device/${d.id}`,
                            entity: { typeName: 'DeviceModel', id: d.id },
                        })),
                    }];
                }) || []
            },
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
                }, ...(flows?.flatMap<TreeViewItemModel>(f => {
                    if (f.devices.length === 1) {
                        const d = f.devices[0] as any;
                        return [{
                            id: `/map/${f.code}/device/${d.id}`,
                            text: d.name,
                            iconRender: (props: IconBaseProps) => <LocationIcon size={22} {...props} />,
                            entity: { typeName: 'DeviceModel', id: d.id },
                            path: `/map/${f.code}/device/${d.id}`,
                        }];
                    }
                    return [{
                        id: `map-flow/${f.code}`,
                        text: f.name,
                        iconRender: (props: IconBaseProps) => <FlowDevicesGroupIcon size={22} {...props} />,
                        expanded: true,
                        items: f.devices.map((d: any) => ({
                            id: `/map/${f.code}/device/${d.id}`,
                            text: d.name,
                            iconRender: (props: IconBaseProps) => <LocationIcon size={22} {...props} />,
                            entity: { typeName: 'DeviceModel', id: d.id },
                            path: `/map/${f.code}/device/${d.id}`,
                        })),
                    }];
                }) || []),]
            },
            {
                id: 'emergency-log',
                text: 'Журнал аварий',
                iconRender: (props: IconBaseProps) => <WarningLogIcon size={20} {...props} />,
                command: 'emergency-log',
            },
            {
                id: 'reports',
                text: 'Отчёты',
                iconRender: (props: IconBaseProps) => <ReportIcon size={20} {...props} />,
                items: [
                    {
                        id: `/reports/1`,
                        text: 'Нештатные ситуации',
                        iconRender: (props: IconBaseProps) => <div style={{ position: 'relative' }}><WarningLogIcon size={20} {...props} /> <div> <SummaryReportIcon size={14} {...props} style={{ position: 'absolute', top: '-5px', right: '-8px' }} /></div></div>,
                        path: `/reports/1`,
                    }
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
