import { Item as TabPanelItem, TabPanel } from 'devextreme-react/tab-panel';
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import PageHeader from "../../components/page-header/page-header";
import AppConstants from "../../constants/app-constants";
import { AdditionalMenuIcon, CircuitIcon, DashboardIcon, GraphIcon, HelpIcon, ParamsIcon, RefreshIcon, ReportIcon, WarningLogIcon } from "../../constants/app-icons";
import type { MenuItemModel } from "../../models/menu-item-model";
import { IconTab } from '../../components/tab-utils/icon-tab';
import { useNavigate, useParams } from 'react-router';
import { DashboardPageContextProvider, useDashboardPage } from './dashboard-page-context';
import { getQuickGuid } from '../../utils/uuid';
import { NoData } from '../../components/no-data-widget/no-data-widget';
import { emergencyMuteManager } from '../../services/emergency-mute-manager';
import { MenuItemWithSubMenu } from '../../components/menu/menu-item/menu-item';
import { quickHelpReferenceService } from '../../components/dialogs/quick-reference-help-dialog/quick-reference-help-dialog.tsx';
import { graphService } from '../../components/dialogs/graph-dialog/graph-dialog.tsx';
import { emergencyLogService } from '../../components/dialogs/emergency-log-dialog/emergency-log-dialog.tsx';
import { useAuthStore } from '../../contexts/auth-store.tsx';
import { selectIsAdmin } from '../../contexts/auth-selectors.ts';

const DashboardPageInner = () => {
    const tabPanelRef = useRef<TabPanel>(null);
    const navigate = useNavigate();
    const isAdmin = useAuthStore(selectIsAdmin);

    const { setRefreshToken, schemaTypeInfoPropertiesChain, device } = useDashboardPage();
    const { flowCode } = useParams();
    const [ControlTabContent, setControlTabContent] = useState<ComponentType<any> | null>(null);
    const [MnemoschemaTabContent, setMnemoschemaTabContent] = useState<ComponentType<any> | null>(null);
    const [tabIndex, setTabIndex] = useState<number>(0);

    const menuItems = useMemo(() => {
        const menuItems = [
            {
                icon: () => <AdditionalMenuIcon size={20} color='black' />,
                items: [
                    {
                        icon: () => <RefreshIcon size={20} />,
                        text: 'Обновить...',
                        onClick: () => {
                            setRefreshToken(getQuickGuid());
                        }
                    },
                    {
                        icon: () => <GraphIcon size={20} />,
                        text: 'Графики...',
                        onClick: () => {
                            if (device) {
                                const s = schemaTypeInfoPropertiesChain?.filter(chain => chain.typeInfo?.ui.chart);
                                graphService.show({ device: device, schemaTypeInfos: s || [] });
                            }
                        }
                    }, {
                        icon: () => <WarningLogIcon size={20} />,
                        text: 'Журнал аварий...',
                        onClick: () => {
                            if (device) {
                                emergencyLogService.show({ device: device });
                            }
                        }
                    }, {
                        icon: () => <HelpIcon size={20} />,
                        text: 'Справка...',
                        onClick: () => {
                            quickHelpReferenceService.show({ referenceKey: 'common/dashboard' });
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
        if (device && device.reports && device.reports.length > 0) {
            menuItems.find(() => true)!.items!
                .splice(1, 0,
                    {
                        render: () => <MenuItemWithSubMenu icon={<ReportIcon size={20} />} text={'Отчеты...'} />,
                        items: device.reports.map((report: any) => ({
                            icon: () => <ReportIcon size={20} />,
                            text: `${report.description}...`,
                            onClick: () => {
                                if (device) {
                                    navigate(`/reports/${report.id}`);
                                }
                            }
                        }))
                    }
                )
        }

        return menuItems;

    }, [device, navigate, schemaTypeInfoPropertiesChain, setRefreshToken]);

    useEffect(() => {
        (async () => {
            const results = await Promise.allSettled([
                import(`./components/control/control-form.tsx`),
                import(`./components/mnemoschema/mnemoschema.tsx`),
            ]);

            const [controlModule, mnemoschemaModule] = results.map(result =>
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
            <PageHeader caption={() => {
                return <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>Приборная панель</span>
                    <span style={{ fontSize: 12, fontWeight: 'normal', minHeight: 16, color: 'rgb(118, 118, 118)' }}>{device ? device.description + (isAdmin ? ` [${device.id}]` : '') : ''}</span>
                </div>
            }} menuItems={menuItems}>
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
