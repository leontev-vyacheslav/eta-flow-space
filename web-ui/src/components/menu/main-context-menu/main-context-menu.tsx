import { ContextMenu } from 'devextreme-react/context-menu';
import type { Item } from 'devextreme/ui/context_menu';
import { forwardRef, type Ref } from 'react';
import type { MenuItemModel } from '../../../models/menu-item-model';
import { MenuItem } from '../menu-item/menu-item';

export type ContextMenuProps = {
  innerRef?: Ref<ContextMenu<MenuItemModel>>;
  items: MenuItemModel[];
}

const MainContextMenu = ({ innerRef, items }: ContextMenuProps) => {

  return <ContextMenu
        ref={ innerRef }
        hideOnOutsideClick={ true }
        itemRender={ (item) => <MenuItem item={ item } /> }
        showEvent={ 'suppress' }
        items={ items as unknown as Item[] }
        position={ { my: 'left top', at: 'left bottom' } }
        visible
    />;
};

const MainContextMenuForward = forwardRef<ContextMenu<MenuItemModel>, ContextMenuProps>((props, ref) =>
  <MainContextMenu { ...props } innerRef={ ref }/>
);

export default MainContextMenuForward;
