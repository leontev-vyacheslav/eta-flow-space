import { useCallback, useEffect, useMemo, useRef } from 'react';
import { TreeView } from 'devextreme-react/tree-view';
import * as events from 'devextreme/events';
import { useSideNavigationMenuItems } from '../../constants/app-navigation';
import { useNavigation } from '../../contexts/navigation';
import { useScreenSize } from '../../utils/media-query';
import { useSharedArea } from '../../contexts/shared-area';
import type { TreeViewItemModel } from '../../models/tree-view-item';
import type { SideNavigationMenuProps } from '../../models/side-navigation-menu-props';

import './side-navigation-menu.scss';
import { quickHelpReferenceService } from '../dialogs/quick-reference-help-dialog/quick-reference-help-dialog';
import { emergencyLogService } from '../dialogs/emergency-log-dialog/emergency-log-dialog';
import { useEmergency } from '../../contexts/emergency-context';

export function SideNavigationMenu(props: SideNavigationMenuProps) {
    const {
        children,
        selectedItemChanged,
        openMenu,
        compactMode,
        onMenuReady
    } = props;

    const { isLarge } = useScreenSize();
    const { signOutWithConfirm, treeViewRef } = useSharedArea();
    const { navigationData: { currentPath } } = useNavigation();
    const wrapperRef = useRef<Element | Element[]>(null);
    const sideNavigationMenuItems = useSideNavigationMenuItems();
    const { redrawEmergencyIcons } = useEmergency();
    const menuContainerRef = useRef<HTMLDivElement>(null);

    // The TreeView renders its item templates (with the alarm icon slots) after the last alarm poll may have
    // drawn, and renders them again on layout changes; fill new slots from the last poll when they appear.
    // Only added slots count: the icons drawn into a slot do not trigger another redraw.
    useEffect(() => {
        const container = menuContainerRef.current;
        if (!container) {
            return;
        }
        let frame = 0;
        const observer = new MutationObserver(mutations => {
            const slotAdded = mutations.some(m => [...m.addedNodes].some(n =>
                n instanceof Element && (n.matches('[data-emergency-icon-container]') || !!n.querySelector('[data-emergency-icon-container]'))));
            if (slotAdded && !frame) {
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    redrawEmergencyIcons();
                });
            }
        });
        observer.observe(container, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [redrawEmergencyIcons]);

    const items: TreeViewItemModel[] = useMemo<TreeViewItemModel[]>(
        () => {
            return sideNavigationMenuItems
                .filter(i => i.visible === undefined || i.visible === true)
                .map((item) => {
                    if (item.path && !(/^\//.test(item.path))) {
                        item.path = `/${item.path}`;
                    }

                    return { ...item, expanded: isLarge } as TreeViewItemModel
                });
        },

        [isLarge, sideNavigationMenuItems]
    );

    const getWrapperRef = useCallback((element: any) => {
        const prevElement = wrapperRef.current;
        if (prevElement) {
            events.off(prevElement, 'dxclick');
        }
        wrapperRef.current = element;
        events.on(element, 'dxclick', () => {
            openMenu();
        });
    }, [openMenu]);

    useEffect(() => {
        (async () => {
            const treeView = treeViewRef.current?.instance;
            if (treeView) {
                if (currentPath !== undefined) {
                    treeView.selectItem(currentPath as any);
                    try {
                        await treeView.expandItem(currentPath as any);
                    } catch {
                        //
                    }
                }
                if (compactMode) {
                    treeView.collapseAll();
                }
            }
        })();
    }, [currentPath, compactMode, treeViewRef]);

    const TreeViewItemContent = (e: TreeViewItemModel) => {
        return (
            <div style={{ display: 'flex', paddingLeft: 5, gap: 10 }}>
                {e.iconRender ? <i className="dx-icon">{e.iconRender({ style: { width: 'auto', flex: '0 0 auto' } })}</i> : null}
                <span style={{ flex: 1 }}>{e.text}</span>
                <i className="dx-icon"
                    style={{ fontSize: 'initial', position: 'relative', display: 'inline' }}
                    {...(e.entity?.typeName === 'DeviceModel' ? { "data-emergency-icon-container": e.entity?.id } : undefined)} >
                </i>
            </div>
        );
    }

    return (
        <div className={'dx-swatch-additional side-navigation-menu'} ref={getWrapperRef}>
            {children}
            <div className={'menu-container'} ref={menuContainerRef}>
                <TreeView
                    ref={treeViewRef}
                    items={items as TreeViewItemModel[]}
                    keyExpr={'path'}
                    selectionMode={'single'}
                    itemRender={TreeViewItemContent}
                    focusStateEnabled={true}
                    expandEvent={'click'}
                    virtualModeEnabled={false}
                    expandAllEnabled={true}

                    onItemClick={async event => {
                        if (!event.itemData) {

                            return;
                        }

                        const treeViewItem = event.itemData as TreeViewItemModel;

                        if (treeViewItem.items && treeViewItem.items.length > 0) {
                            if (!event.node!.expanded) {
                                await treeViewRef.current!.instance.collapseItem(treeViewItem);
                            } else {
                                await treeViewRef.current!.instance.expandItem(treeViewItem);
                            }

                            return;
                        }

                        selectedItemChanged(event);

                        if (treeViewItem.command === 'exit') {
                            signOutWithConfirm();

                            return;
                        }

                        if (treeViewItem.command === 'help') {
                            quickHelpReferenceService.show({ referenceKey: 'common/introduction'});

                            return;
                        }

                        if (treeViewItem.command === 'emergency-log') {
                            emergencyLogService.show({});

                            return;
                        }

                        if (treeViewRef.current) {
                            setTimeout(() => {
                                treeViewRef.current!.instance.selectItem(event.itemData!);
                                localStorage.setItem('lastNavigationPath', event.itemData!.path);
                            }, 100)
                        }
                    }}
                    onContentReady={() => {
                        onMenuReady();
                    }}
                    width={'100%'}
                    height={'calc(100vh - 77px)'}
                />
            </div>
        </div>
    );
}
