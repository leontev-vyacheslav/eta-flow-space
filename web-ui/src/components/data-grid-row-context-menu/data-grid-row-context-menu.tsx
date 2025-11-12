import React, { useMemo } from 'react';
import { DeleteIcon, EditIcon } from '../../constants/app-icons';
import ContextMenu from 'devextreme-react/context-menu';
import ContextMenuItem from '../context-menu-item/context-menu-item';
import type { ContextMenuProps } from '../../models/context-menu-props';
import type { ItemContextMenuEvent } from 'devextreme/ui/context_menu';
import type { ContextMenuItemItemModel } from '../../models/context-menu-item-props';

const DataGridRowContextMenu = ({ innerRef, commands }: ContextMenuProps) => {

    const items = useMemo(() => {
        return [{
            text: 'Редактировать...',
            renderIconItem: () => <EditIcon size={ 18 } />,
            onClick: async (e: ItemContextMenuEvent) => {
                await e.component.hide();
                if (commands.edit) {
                    await commands.edit();
                }
            }
        }, {
            text: 'Удалить...',
            renderIconItem: () => <DeleteIcon size={ 18 } />,
            onClick: async (e: ItemContextMenuEvent) => {
                await e.component.hide();
                if (commands.remove) {
                    await commands.remove();
                }
            }
        }] as ContextMenuItemItemModel[];
    }, [commands]);

    return <ContextMenu
        ref={ innerRef }
        closeOnOutsideClick={ true }
        itemRender={ (item) => <ContextMenuItem item={ item }/> }
        showEvent={ 'suppress' }
        items={ items }
        position={ { my: 'left top', at: 'left bottom' } }
    />
}

export default React.forwardRef<ContextMenu<ContextMenuItemItemModel>, ContextMenuProps>((props, ref) =>
  <DataGridRowContextMenu { ...props } innerRef={ ref } />
);
