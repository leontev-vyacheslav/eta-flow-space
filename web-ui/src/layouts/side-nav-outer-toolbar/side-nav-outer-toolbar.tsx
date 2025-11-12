import Drawer from 'devextreme-react/drawer';
import ScrollView from 'devextreme-react/scroll-view';
import React, { type ReactElement, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Footer, Header, SideNavigationMenu } from '../../components';
import { useScreenSize } from '../../utils/media-query';
import { useMenuPatch } from '../../utils/patches';
import { Template } from 'devextreme-react/core/template';
import type { SideNavProps } from '../../models/side-nav-props';
import type { ClickEvent } from 'devextreme/ui/button';

import './side-nav-outer-toolbar.scss';

export function SideNavOuterToolbar({ title, children }: SideNavProps) {
    const scrollViewRef = useRef<ScrollView>(null);
    const history = useNavigate();
    const { isXSmall, isLarge } = useScreenSize();
    const [patchCssClass, onMenuReady] = useMenuPatch();
    const [menuStatus, setMenuStatus] = useState(
        isLarge ? MenuStatus.Opened : MenuStatus.Closed
    );

    const toggleMenu = useCallback(({ event }: ClickEvent) => {
        setMenuStatus(
            prevMenuStatus => prevMenuStatus === MenuStatus.Closed
                ? MenuStatus.Opened
                : MenuStatus.Closed
        );
        event?.stopPropagation();
    }, []);

    const temporaryOpenMenu = useCallback(() => {
        setMenuStatus(
            prevMenuStatus => prevMenuStatus === MenuStatus.Closed
                ? MenuStatus.TemporaryOpened
                : prevMenuStatus
        );
    }, []);

    const onOutsideClick = useCallback(() => {
        let result = false;
        setMenuStatus(
            prevMenuStatus => {
                result = prevMenuStatus !== MenuStatus.Closed && !isLarge;
                return prevMenuStatus !== MenuStatus.Closed && !isLarge
                  ? MenuStatus.Closed
                  : prevMenuStatus;
            }
        );

        return result;
    }, [isLarge]);


    const onNavigationChanged = useCallback(({ itemData: { path }, event, node }: any) => {

        if (!isLarge || menuStatus === MenuStatus.TemporaryOpened) {
            setMenuStatus(MenuStatus.Closed);
            event.stopPropagation();
        }

        if (menuStatus === MenuStatus.Closed || !path || node.selected) {
            event.preventDefault();
            return;
        }

        if (!isLarge || menuStatus === MenuStatus.TemporaryOpened) {
            setMenuStatus(MenuStatus.Closed);
            event.stopPropagation();
        }

        setTimeout(() => {
            history(path);
            scrollViewRef.current?.instance.scrollTo(0);
        }, 100);

    }, [history, menuStatus, isLarge]);

    return (
        <div className={ 'side-nav-outer-toolbar' }>
            <Header
                menuToggleEnabled
                toggleMenu={ toggleMenu }
                title={ title }
            />
            <Drawer
                className={ ['drawer', patchCssClass].join(' ') }
                position={ 'before' }
                closeOnOutsideClick={ onOutsideClick }
                openedStateMode={ isLarge ? 'shrink' : 'overlap' }
                revealMode={ isXSmall ? 'slide' : 'expand' }
                minSize={ isXSmall ? 0 : 45 }
                maxSize={ 250 }
                shading={ !isLarge }
                opened={ menuStatus !== MenuStatus.Closed }
                template={ 'menu' }
            >
                <div className={ 'container' }>
                    <ScrollView ref={ scrollViewRef } className={ 'layout-body with-footer' } height={ () => {
                        return window.innerHeight - 76;
                    } }>
                        <div className={ 'content' }>
                            { React.Children.map(children, (item) => {
                                return (item as ReactElement).type !== Footer && item;
                            }) }
                        </div>
                        <div className={ 'content-block' }>
                            { React.Children.map(children, (item) => {
                                return (item as ReactElement).type === Footer && item;
                            }) }
                        </div>
                    </ScrollView>
                </div>
                <Template name={ 'menu' }>
                    <SideNavigationMenu
                        compactMode={ menuStatus === MenuStatus.Closed }
                        selectedItemChanged={ onNavigationChanged as any }
                        openMenu={ temporaryOpenMenu }
                        onMenuReady={ onMenuReady }
                    />
                </Template>
            </Drawer>
        </div>
    );
}

const MenuStatus = {
    Closed: 1,
    Opened: 2,
    TemporaryOpened: 3
};
