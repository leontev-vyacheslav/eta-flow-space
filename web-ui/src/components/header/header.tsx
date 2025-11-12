import './header.scss';
import Toolbar, { Item } from 'devextreme-react/toolbar';
import Button from 'devextreme-react/button';
import AppLogo from '../../assets/app-logo.svg?react';
import { useAppSettings } from '../../contexts/app-settings';
import {  MenuIcon } from '../../constants/app-icons';
import type { HeaderProps } from '../../models/header-props';

import { WorkDateWidget } from '../work-date-widget/work-date-widget';

// import { useAuth } from '../../contexts/auth';
// import MainContextMenu from '../menu/main-context-menu/main-context-menu';
// import ContextMenu from 'devextreme-react/context-menu';
// import { MenuItemModel } from '../../models/menu-item-model';

const Header = ({ title, menuToggleEnabled,  toggleMenu } : HeaderProps) => {
    const { appSettingsData } = useAppSettings();
    // const { user } = useAuth();
    // const contextMenuRef = useRef<ContextMenu<MenuItemModel>>(null);

    return (
        <header className={ 'header-component' }>
            <Toolbar className={ 'header-toolbar' }>
                <Item visible={ menuToggleEnabled } location={ 'before' } widget={ 'dxButton' } cssClass={ 'menu-button' }>
                    <Button icon={ 'none' } onClick={ toggleMenu }>
                        <MenuIcon size={ 30 }/>
                    </Button>
                </Item>
                <Item
                    location={ 'before' }
                    cssClass={ 'header-title' }
                    text={ title }
                    visible={ !!title }
                    render={ () => {
                        return (
                            <div className={ 'header-title-logo-container' }>
                                <AppLogo width={ 60 }/>
                                <div>{ title }</div>
                            </div>
                        );
                    } }
                />
                 {/* <Item visible={ menuToggleEnabled } location={ 'after' } widget={ 'dxButton' } cssClass={ 'menu-button' }>
                    <Button icon={ 'none' } onClick={ async (e) => {
                        if(contextMenuRef && contextMenuRef.current) {
                            contextMenuRef.current.instance.option('target', e.element);

                            await contextMenuRef.current.instance.show();
                        }
                    } }>
                        <AdditionalMenuIcon size={ 24 }/>
                    </Button>
                </Item> */}

                {
                    appSettingsData.workDate ?
                        <Item location={ 'after' } locateInMenu={ 'auto' } >
                            <WorkDateWidget />
                        </Item>
                        : null
                }
            </Toolbar>
            {/* <MainContextMenu ref={ contextMenuRef } items={ [
                {
                    text: `Пользователь: ${user?.login}`,
                    icon: () => <RefreshIcon size={ 20 } />,

            }] } /> */}
        </header>
    )
}

export default Header;
