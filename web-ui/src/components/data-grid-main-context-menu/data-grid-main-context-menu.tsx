import React, { useMemo } from 'react';
import { AddIcon, ExportToXlsxIcon, RefreshIcon } from '../../constants/app-icons';
import ContextMenu from 'devextreme-react/context-menu';
import ContextMenuItem from '../context-menu-item/context-menu-item';
import type { ContextMenuProps } from '../../models/context-menu-props';
import type { ContextMenuItemItemModel } from '../../models/context-menu-item-props';
import type { ItemContextMenuEvent } from 'devextreme/ui/context_menu';

const DataGridMainContextMenu = ({ innerRef, commands }: ContextMenuProps) => {
    const items = useMemo(() => {
        return [
            {
                text: 'Обновить...',
                renderIconItem: () => <RefreshIcon size={ 18 }/>,
                onClick: async (e: ItemContextMenuEvent) => {
                    await e.component.hide();
                    if(commands.refresh) {
                        await commands.refresh();
                    }
                }
            },
            {
                text: 'Добавить...',
                renderIconItem: () => <AddIcon size={ 18 }/>,
                onClick: async (e: ItemContextMenuEvent) => {
                    await e.component.hide();
                    if(commands.add) {
                        commands.add();
                    }
                }
            },
            {
                text: 'Экспорт в XLSX...',
                renderIconItem: () => <ExportToXlsxIcon size={ 18 }/>,
                onClick: async (e: ItemContextMenuEvent) => {
                    await e.component.hide();
                    if(commands.exportToXlsx) {
                        await commands.exportToXlsx();
                    }
                }
            }] as ContextMenuItemItemModel[];
    }, [commands]);

    return <ContextMenu
        ref={ innerRef }
        hideOnOutsideClick={ true }
        itemRender={ (item) => <ContextMenuItem item={ item } /> }
        showEvent={ 'suppress' }
        items={ items }
        position={ { my: 'left top', at: 'left bottom' } }
    />
}

export default React.forwardRef<ContextMenu<ContextMenuItemItemModel>, ContextMenuProps>((props, ref) =>
  <DataGridMainContextMenu { ...props } innerRef={ ref }/>
);
