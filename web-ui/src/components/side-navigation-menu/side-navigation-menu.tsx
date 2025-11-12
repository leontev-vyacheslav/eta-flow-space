import { useCallback, useEffect, useMemo, useRef } from 'react';
import { TreeView } from 'devextreme-react/tree-view';
import * as events from 'devextreme/events';
import { useSideNavigationMenuItems } from '../../constants/app-navigation';
import { useNavigation } from '../../contexts/navigation';
import { useScreenSize } from '../../utils/media-query';
import { useSharedArea } from '../../contexts/shared-area';
import type { TreeViewItemModel } from '../../models/tree-view-item';
import type { SideNavigationMenuProps } from '../../models/side-navigation-menu-props';
import { useWorkdatePicker } from '../../contexts/workdate-context';

import './side-navigation-menu.scss';
// import { quickHelpReferenceService } from '../../services/quick-help-reference-service';

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
    const { showWorkDatePicker } = useWorkdatePicker();
    const { navigationData: { currentPath } } = useNavigation();

    const wrapperRef = useRef();
    const sideNavigationMenuItems = useSideNavigationMenuItems();


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

    const getWrapperRef = useCallback((element) => {
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
                    } catch (ex) {
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
            <>
                {e.iconRender ? <i className="dx-icon">{e.iconRender({})}</i> : null}
                <span>{e.text}</span>
            </>
        );
    }

    return (
        <div className={ 'dx-swatch-additional side-navigation-menu' } ref={ getWrapperRef }>
            {children}
            <div className={ 'menu-container' }>
                <TreeView
                    ref={ treeViewRef }
                    items={ items as TreeViewItemModel[] }
                    keyExpr={ 'path' }
                    selectionMode={ 'single' }
                    itemRender={ TreeViewItemContent }
                    focusStateEnabled={ true }
                    expandEvent={ 'click' }
                    onItemClick={ async event => {
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

                        if (treeViewItem.command === 'workDate') {
                            showWorkDatePicker();

                            return;
                        }

                        if (treeViewItem.command === 'exit') {
                            signOutWithConfirm();

                            return;
                        }

                        if (treeViewItem.command === 'help') {
                            quickHelpReferenceService.show('common/introduction');

                            return;
                        }

                        if (treeViewRef.current) {
                            setTimeout(() => {
                                treeViewRef.current!.instance.selectItem(event.itemData!);
                            }, 100)
                        }
                    } }
                    onContentReady={ () => {
                        onMenuReady();
                    } }
                    width={ '100%' }
                />
            </div>
        </div>
    );
}
