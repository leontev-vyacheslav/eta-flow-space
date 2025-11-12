import './home-page.scss';
import AppConstants from '../../constants/app-constants';
import { HeatingCircuitCodeIcon, HeatingCircuitMnemoschemaIcon, HomeIcon, AdditionalMenuIcon, RefreshIcon, HelpIcon } from '../../constants/app-icons';
import PageHeader from '../../components/page-header/page-header';
import { TabPanel } from 'devextreme-react/tab-panel'
import { useMemo, useRef, useState } from 'react';
import { formatMessage } from 'devextreme/localization';
import type { MenuItemModel } from '../../models/menu-item-model';

import { getQuickGuid } from '../../utils/uuid';
import { HomePageContextProvider, useHomePage } from './home-page-context';
// import { quickHelpReferenceService } from '../../services/quick-help-reference-service';

export const HomePageInternal = () => {
    const { isShowMnemoschema, setIsShowMnemoschema, setUpdateSharedRegulatorStateRefreshToken } = useHomePage();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
    const tabPanelRef = useRef<TabPanel>(null);

    const menuItems = useMemo(() => {
        return [
            {
                icon: () => <AdditionalMenuIcon size={20} color='black' />,
                items: [
                    {
                        icon: () => isShowMnemoschema ? <HeatingCircuitCodeIcon size={20} color='black' /> : <HeatingCircuitMnemoschemaIcon size={20} color='black' />,
                        text: isShowMnemoschema ? 'Показать параметры' : 'Показать мнемосхему',
                        onClick: () => {
                            setIsShowMnemoschema(previous => !previous);
                            tabPanelRef.current?.instance.repaint()
                        },
                    },
                    {
                        icon: () => <RefreshIcon size={20} />,
                        text: 'Обновить...',
                        onClick: () => {
                            setUpdateSharedRegulatorStateRefreshToken(getQuickGuid());
                        }
                    },

                    {
                        icon: () => <HelpIcon size={20} />,
                        text: 'Справка...',
                        onClick: () => {
                            // quickHelpReferenceService.show('home/mnemoschema');
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
    }, [isShowMnemoschema, setIsShowMnemoschema, setUpdateSharedRegulatorStateRefreshToken]);

    return (
        <>
            <PageHeader caption={'Главная'} menuItems={menuItems}>
                <HomeIcon size={AppConstants.headerIconSize} />
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
                            setActiveTabIndex(value);
                        }}>
                    </TabPanel>
                    : <div className='dx-empty-message' style={{ height: AppConstants.pageHeight, }}>{formatMessage('dxCollectionWidget-noDataText')}</div>
                </div>
            </div>
        </>
    );
};

export const HomePage = () => {
    return (
        <HomePageContextProvider>
            <HomePageInternal />
        </HomePageContextProvider>
    )
}