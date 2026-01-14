import { Item as TabPanelItem, TabPanel } from 'devextreme-react/tab-panel';
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import PageHeader from "../../components/page-header/page-header";
import AppConstants from "../../constants/app-constants";
import { AdditionalMenuIcon, CircuitIcon, DashboardIcon, HelpIcon, MapIcon, ParamsIcon, RefreshIcon } from "../../constants/app-icons";
import type { MenuItemModel } from "../../models/menu-item-model";
import { quickHelpReferenceService } from "../../services/quick-help-reference-service";
import { IconTab } from '../../components/tab-utils/icon-tab';
import { useParams } from 'react-router';
import { DashboardPageContextProvider, useDashboardPage } from './dashboard-page-context';
import { getQuickGuid } from '../../utils/uuid';

const DashboardPageInner = () => {
    const tabPanelRef = useRef<TabPanel>(null);
    const { setUpdateSharedStateRefreshToken } = useDashboardPage();
    const { flowCode } = useParams();
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
                            setUpdateSharedStateRefreshToken(getQuickGuid());
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
    }, [setUpdateSharedStateRefreshToken]);

    useEffect(() => {
        (async () => {

            const results = await Promise.allSettled([
                import(`./flows/${flowCode}/control/control-tab-content.tsx`),
                import(`./flows/${flowCode}/mnemoschema/mnemoschema-tab-content.tsx`),
                import(`./flows/${flowCode}/map/map-tab-content.tsx`)
            ]);

            const [controlModule, mnemoschemaModule, mapModule] = results.map(result =>
                result.status === 'fulfilled' ? result.value : null
            );
            // debugger
            setControlTabContent(() => controlModule ? controlModule.default : null);
            setMnemoschemaTabContent(() => mnemoschemaModule ? mnemoschemaModule.default : null);
            setMapTabContent(() => mapModule ? mapModule.default : null);
        })();
    }, [flowCode]);

    return (
        <>
            <PageHeader caption={'Приборная панель'} menuItems={menuItems}>
                <DashboardIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div className={'content-block'}>
                <div className={'dx-card responsive-paddings dashboard-page-content'}>
                    <TabPanel ref={tabPanelRef}
                        swipeEnabled={false}
                        animationEnabled={false}
                        width={'100%'}
                        height={AppConstants.pageHeight}
                        loop
                        className='dashboard-tabs'
                        deferRendering
                        onSelectedIndexChange={(value: number) => {
                             setTabIndex(value);
                        }}>

                        <TabPanelItem disabled={MnemoschemaTabContent === null} title='Мнемосхема' tabRender={(e) => <IconTab tab={e} icon={<CircuitIcon size={18} />} />}>
                            {
                                MnemoschemaTabContent && tabIndex === 0 ?
                                 <MnemoschemaTabContent />
                                 : null
                            }
                        </TabPanelItem>

                        <TabPanelItem disabled={ControlTabContent === null} title='Управление' tabRender={(e) => <IconTab tab={e} icon={<ParamsIcon size={18} />} />}>
                            {
                                ControlTabContent && tabIndex === 1 ? <ControlTabContent /> : null
                            }
                        </TabPanelItem>

                        <TabPanelItem disabled={MapTabContent === null} title='Карта' tabRender={(e) => <IconTab tab={e} icon={<MapIcon size={18} />} />}>
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
