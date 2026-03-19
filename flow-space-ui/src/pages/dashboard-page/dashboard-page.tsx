import { Item as TabPanelItem, TabPanel } from 'devextreme-react/tab-panel';
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import PageHeader from "../../components/page-header/page-header";
import AppConstants from "../../constants/app-constants";
import { AdditionalMenuIcon, CircuitIcon, DashboardIcon, GraphIcon, HelpIcon, ParamsIcon, RefreshIcon, WarningLogIcon } from "../../constants/app-icons";
import type { MenuItemModel } from "../../models/menu-item-model";
import { quickHelpReferenceService } from "../../services/quick-help-reference-service";
import { IconTab } from '../../components/tab-utils/icon-tab';
import { useParams } from 'react-router';
import { DashboardPageContextProvider, useDashboardPage } from './dashboard-page-context';
import { getQuickGuid } from '../../utils/uuid';
import { NoData } from '../../components/no-data-widget/no-data-widget';
import { emergencyLogService } from '../../services/emergency-log-service';
import { graphService } from '../../services/graph-service';
import { emergencyMuteManager } from '../../services/emergency-mute-manager';

const DashboardPageInner = () => {
    const tabPanelRef = useRef<TabPanel>(null);
    const { setRefreshToken, schemaTypeInfoPropertiesChain } = useDashboardPage();
    const { flowCode, deviceId } = useParams();
    const [ControlTabContent, setControlTabContent] = useState<ComponentType<any> | null>(null);
    const [MnemoschemaTabContent, setMnemoschemaTabContent] = useState<ComponentType<any> | null>(null);
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
                            setRefreshToken(getQuickGuid());
                        }
                    }, {
                        icon: () => <GraphIcon size={20} />,
                        text: 'Графики...',
                        onClick: () => {
                            if (deviceId) {
                                const s = schemaTypeInfoPropertiesChain?.filter(chain => chain.typeInfo?.ui.chart);
                                graphService.show({ deviceId: parseInt(deviceId), schemaTypeInfos: s || [] });
                            }
                        }
                    }, {
                        icon: () => <WarningLogIcon size={20} />,
                        text: 'Журнал аварий...',
                        onClick: () => {
                            if (deviceId) {
                                emergencyLogService.show({ deviceId: parseInt(deviceId) });
                            }
                        }
                    }, {
                        icon: () => <HelpIcon size={20} />,
                        text: 'Справка...',
                        onClick: () => {
                            quickHelpReferenceService.show('common/dashboard');
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
    }, [deviceId, schemaTypeInfoPropertiesChain, setRefreshToken]);


    useEffect(() => {
        (async () => {
            const results = await Promise.allSettled([
                import(`./flows/${flowCode}/control/control-tab-content.tsx`),
                import(`./flows/${flowCode}/mnemoschema/mnemoschema-tab-content.tsx`),
            ]);

            const [controlModule, mnemoschemaModule /*, mapModule*/] = results.map(result =>
                result.status === 'fulfilled' ? result.value : null
            );
            setControlTabContent(() => controlModule ? controlModule.default : null);
            setMnemoschemaTabContent(() => mnemoschemaModule ? mnemoschemaModule.default : null);
            if (tabPanelRef?.current) {
                const tabIndex = tabPanelRef.current?.instance.option('selectedIndex');
                if (tabIndex) {
                    setTabIndex(-1);
                    setTimeout(() => {
                        setTabIndex(tabIndex);
                    }, 0);
                }
            }
        })();
    }, [flowCode]);

    useEffect(() => {
        const unlock = () => emergencyMuteManager.unlockAudio();
        document.addEventListener('click', unlock, { once: true });
        return () => document.removeEventListener('click', unlock);
    }, []);

    return (
        <>
            <PageHeader caption={'Приборная панель'} menuItems={menuItems}>
                <DashboardIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div className={'content-block'}>
                <div className={'dx-card responsive-paddings dashboard-page-content'}>
                    <TabPanel
                        ref={tabPanelRef}
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

                        <TabPanelItem title='Мнемосхема' tabRender={(e) => <IconTab tab={e} icon={<CircuitIcon size={18} />} />}>
                            {
                                MnemoschemaTabContent && tabIndex === 0 ?
                                    <MnemoschemaTabContent />
                                    : <NoData />
                            }
                        </TabPanelItem>

                        <TabPanelItem title='Управление' tabRender={(e) => <IconTab tab={e} icon={<ParamsIcon size={18} />} />}>
                            {
                                ControlTabContent && tabIndex === 1
                                    ? <ControlTabContent />
                                    : <NoData />
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
