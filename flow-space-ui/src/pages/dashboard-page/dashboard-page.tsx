import { Item as TabPanelItem, TabPanel } from 'devextreme-react/tab-panel';
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import PageHeader from "../../components/page-header/page-header";
import AppConstants from "../../constants/app-constants";
import { AdditionalMenuIcon, CircuitIcon, DashboardIcon, HelpIcon, MapIcon, ParamsIcon, RefreshIcon } from "../../constants/app-icons";
import type { MenuItemModel } from "../../models/menu-item-model";
import { quickHelpReferenceService } from "../../services/quick-help-reference-service";
import { IconTab } from '../../components/tab-utils/icon-tab';
import { useParams } from 'react-router';
import { useAppData } from '../../contexts/app-data/app-data';
import type { DeviceStateModel } from '../../models/flows/device-state-model';

export const DashboardPage = () => {
    const { getDeviceStateAsync, getMnemoschemaAsync } = useAppData();
    const tabPanelRef = useRef<TabPanel>(null);
    const { deviceId, flowUid } = useParams();
    const [ControlTabContent, setControlTabContent] = useState<ComponentType<any> | null>(null);
    const [MnemoschemaTabContent, setMnemoschemaTabContent] = useState<ComponentType<any> | null>(null);
    const [MapTabContent, setMapTabContent] = useState<ComponentType<any> | null>(null);
    const [deviceState, setDeviceState] = useState<DeviceStateModel | undefined>();
    const [mnemoschema, setMnemoschema] = useState<string | undefined>();

    const menuItems = useMemo(() => {
        return [
            {
                icon: () => <AdditionalMenuIcon size={20} color='black' />,
                items: [
                    {
                        icon: () => <RefreshIcon size={20} />,
                        text: 'Обновить...',
                        onClick: () => {
                            // setUpdateSharedRegulatorStateRefreshToken(getQuickGuid());
                        }
                    },

                    {
                        icon: () => <HelpIcon size={20} />,
                        text: 'Справка...',
                        onClick: () => {
                            quickHelpReferenceService.show('home/mnemoschema');
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
    }, []);

    useEffect(() => {
        (async () => {
            const [controlModule, mnemoschemaModule, mapModule] = await Promise.all([
                import(/* @vite-ignore */`./tab-contents/${flowUid}/control-tab-content.tsx`),
                import(/* @vite-ignore */`./tab-contents/${flowUid}/mnemoschema-tab-content.tsx`),
                import(/* @vite-ignore */`./tab-contents/${flowUid}/map-tab-content.tsx`)
            ]);

            setControlTabContent(() => controlModule.default);
            setMnemoschemaTabContent(() => mnemoschemaModule.default);
            setMapTabContent(() => mapModule.default);

            if (deviceId) {
                const [deviceState, mnemoschema] = await Promise.all([
                    getDeviceStateAsync(parseInt(deviceId)),
                    getMnemoschemaAsync(parseInt(deviceId))
                ])
                if (deviceState) {
                    setDeviceState(deviceState);
                }
                if (mnemoschema) {
                    setMnemoschema(mnemoschema);
                }
            }
        })();
    }, [deviceId, flowUid, getDeviceStateAsync, getMnemoschemaAsync]);

    return (
        <>
            <PageHeader caption={'Приборная панель'} menuItems={menuItems}>
                <DashboardIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div className={'content-block'}>
                <div className={'dx-card responsive-paddings home-page-content'}>
                    <TabPanel ref={tabPanelRef}
                        swipeEnabled={false}
                        animationEnabled
                        width={'100%'}
                        height={AppConstants.pageHeight}
                        loop
                        onSelectedIndexChange={(value: number) => {
                            console.log(value);
                        }}>
                        <TabPanelItem title='Мнемосхема' tabRender={(e) => <IconTab tab={e} icon={<CircuitIcon size={18} />} />}>
                            {MnemoschemaTabContent ? <MnemoschemaTabContent flowUid={flowUid} deviceState={deviceState} mnemoschema={mnemoschema} /> : null}
                        </TabPanelItem>
                        <TabPanelItem title='Управление' tabRender={(e) => <IconTab tab={e} icon={<ParamsIcon size={18} />} />}>
                            {ControlTabContent ? <ControlTabContent flowUid={flowUid} deviceState={deviceState} /> : null}
                        </TabPanelItem>

                        <TabPanelItem title='Карта' tabRender={(e) => <IconTab tab={e} icon={<MapIcon size={18} />} />}>
                            {MapTabContent ? <MapTabContent flowUid={flowUid} deviceState={deviceState} /> : null}
                        </TabPanelItem>
                    </TabPanel>
                </div>
            </div>
        </>
    );
}

