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
import { DashboardPageContextProvider } from './dashboard-page-context';

const DashboardPageInner = () => {
    const { getDeviceAsync, getDeviceStateAsync, getMnemoschemaAsync } = useAppData();
    const tabPanelRef = useRef<TabPanel>(null);
    const { deviceId, flowCode } = useParams();
    const [ControlTabContent, setControlTabContent] = useState<ComponentType<any> | null>(null);
    const [MnemoschemaTabContent, setMnemoschemaTabContent] = useState<ComponentType<any> | null>(null);
    const [MapTabContent, setMapTabContent] = useState<ComponentType<any> | null>(null);

    const [tabIndex, setTabIndex] = useState<number>(0);

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
                            quickHelpReferenceService.show('common/dashboard');
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
    }, []);

    useEffect(() => {
        (async () => {
            const [controlModule, mnemoschemaModule, mapModule] = await Promise.all([
                import(/* @vite-ignore */`./flows-tab-contents/${flowCode}/control-tab-content.tsx`),
                import(/* @vite-ignore */`./flows-tab-contents/${flowCode}/mnemoschema-tab-content.tsx`),
                import(/* @vite-ignore */`./flows-tab-contents/${flowCode}/map-tab-content.tsx`)
            ]);

            setControlTabContent(() => controlModule.default);
            setMnemoschemaTabContent(() => mnemoschemaModule.default);
            setMapTabContent(() => mapModule.default);
        })();
    }, [deviceId, flowCode, getDeviceAsync, getDeviceStateAsync, getMnemoschemaAsync]);

    return (
        <>
            <PageHeader caption={'Приборная панель'} menuItems={menuItems}>
                <DashboardIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div className={'content-block'}>
                <div className={'dx-card responsive-paddings daghboard-page-content'}>
                    <TabPanel ref={tabPanelRef}
                        swipeEnabled={false}
                        animationEnabled={false}
                        width={'100%'}
                        height={AppConstants.pageHeight}
                        loop
                        onSelectedIndexChange={(value: number) => {
                            console.log(value);
                            setTabIndex(value);
                        }}>
                        <TabPanelItem title='Мнемосхема' tabRender={(e) => <IconTab tab={e} icon={<CircuitIcon size={18} />} />}>
                            {
                                MnemoschemaTabContent && tabIndex === 0 ? <MnemoschemaTabContent /> : null
                            }
                        </TabPanelItem>
                        <TabPanelItem title='Управление' tabRender={(e) => <IconTab tab={e} icon={<ParamsIcon size={18} />} />}>
                            {
                                ControlTabContent && tabIndex === 1 ? <ControlTabContent /> : null
                            }
                        </TabPanelItem>
                        <TabPanelItem title='Карта' tabRender={(e) => <IconTab tab={e} icon={<MapIcon size={18} />} />}>
                            {
                                MapTabContent && tabIndex === 2 ? <MapTabContent /> : null
                            }
                        </TabPanelItem>
                    </TabPanel>
                </div>
            </div>
        </>
    );
}

export const DashboardPage = () => {
    return (
        <DashboardPageContextProvider>
            <DashboardPageInner />
        </DashboardPageContextProvider>
    );
}
