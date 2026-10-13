import { useMemo } from 'react';
import {
    AboutIcon,
    ExitIcon,
    HelpIcon,
    FlowIcon,
    DeviceIcon,
    BoilerRoomIcon,
    WarningLogIcon,
    MapIcon,
    LocationIcon,
    LocationAllIcon,
    ReportIcon,
    SummaryReportIcon,
    FlowDevicesGroupIcon,
} from './app-icons';
import type { TreeViewItemModel } from '../models/tree-view-item';
import type { FlowModel } from '../models/flows/flow-model';
import type { IconBaseProps } from 'react-icons';
import { useAppSettingsStore } from '../contexts/app-settings-store';

// boiler rooms (device codes "…-boiler-room", the controllers) get their own icon; meters keep the device icon
const DeviceMenuIcon = ({ code, ...props }: IconBaseProps & { code: string }) =>
    code.endsWith('-boiler-room') ? <BoilerRoomIcon size={22} {...props} /> : <DeviceIcon size={22} {...props} />;

// the devices of a flow listed in the side menu: all of them, or only the main one (the device the diagram belongs to,
// whose code is the flow's code); a flow without such a device keeps all its devices, so nothing disappears by mistake
const shownDevices = (flow: FlowModel, isShowedAllDevices: boolean) => {
    if (isShowedAllDevices) {
        return flow.devices;
    }
    const mainDevices = flow.devices.filter(d => d.code === flow.code);

    return mainDevices.length > 0 ? mainDevices : flow.devices;
};

export const useSideNavigationMenuItems = () => {
    const flows = useAppSettingsStore((s) => s.flows);
    // a user setting, off unless the user turned it on: "Карта объектов" then lists only "Все объекты"
    const isShowedAllMapObject = useAppSettingsStore((s) => s.appSettingsData.userSettings?.isShowedAllMapObject ?? false);
    // a user setting, on unless the user turned it off: off lists only the boiler room of each flow, not its meters
    const isShowedAllDevices = useAppSettingsStore((s) => s.appSettingsData.userSettings?.isShowedAllDevices ?? true);

    return useMemo<TreeViewItemModel[]>(() => {
        const devicesOf = (f: FlowModel) => shownDevices(f, isShowedAllDevices);

        return [
            {
                id: 'objects',
                text: 'Объекты',
                iconRender: (props: IconBaseProps) => <FlowIcon size={22} {...props} />,
                items: flows?.flatMap<TreeViewItemModel>(f => {
                    if (devicesOf(f).length === 1) {
                        const d = devicesOf(f)[0] as any;
                        return [{
                            id: `${f.code}/device/${d.id}`,
                            text: d.name,
                            iconRender: (props: IconBaseProps) => <DeviceMenuIcon code={d.code} {...props} />,
                            path: `/${f.code}/device/${d.id}`,
                            entity: { typeName: 'DeviceModel', id: d.id },
                        }];
                    }
                    return [{
                        id: `flow/${f.code}`,
                        text: `${f.name}`,
                        iconRender: (props: IconBaseProps) => <FlowDevicesGroupIcon size={22} {...props} />,
                        expanded: true,
                        items: devicesOf(f).map((d: any) => ({
                            id: `${f.code}/device/${d.id}`,
                            text: d.name,
                            iconRender: (props: IconBaseProps) => <DeviceMenuIcon code={d.code} {...props} />,
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
                }, ...(isShowedAllMapObject ? flows?.flatMap<TreeViewItemModel>(f => {
                    if (devicesOf(f).length === 1) {
                        const d = devicesOf(f)[0] as any;
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
                        items: devicesOf(f).map((d: any) => ({
                            id: `/map/${f.code}/device/${d.id}`,
                            text: d.name,
                            iconRender: (props: IconBaseProps) => <LocationIcon size={22} {...props} />,
                            entity: { typeName: 'DeviceModel', id: d.id },
                            path: `/map/${f.code}/device/${d.id}`,
                        })),
                    }];
                }) ?? [] : []),]
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
    }, [flows, isShowedAllMapObject, isShowedAllDevices]);
};
