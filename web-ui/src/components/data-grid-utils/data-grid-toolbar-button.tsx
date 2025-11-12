import type { RefObject } from 'react';
import { Button } from 'devextreme-react/button';
import { GridAdditionalMenuIcon } from '../../constants/app-icons';
import ContextMenu from 'devextreme-react/context-menu';
import type { ContextMenuItemItemModel } from '../../models/context-menu-item-props';

const onDataGridToolbarPreparing = (e: any) => {
    if (e?.toolbarOptions) {
        e.toolbarOptions.items.forEach((i: any) => {
            i.location = 'before';
        })

        e.toolbarOptions.items.unshift({
                location: 'before',
                template: 'DataGridToolbarButtonTemplate'
            }
        );
    }
}

const DataGridToolbarButton = ({ contextMenuRef }: { contextMenuRef:  RefObject<ContextMenu<ContextMenuItemItemModel>> }) => {
    return (
        <Button className={ 'app-command-button app-command-button-small' } onClick={ async (e) => {
            if (contextMenuRef && contextMenuRef.current) {
                contextMenuRef.current.instance.option('target', e.element);
                await contextMenuRef.current.instance.show();
            }
        } }>
            <GridAdditionalMenuIcon/>
        </Button>
    );
}

export { onDataGridToolbarPreparing, DataGridToolbarButton };
