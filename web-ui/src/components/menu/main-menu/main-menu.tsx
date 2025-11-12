import '../main-menu.css';
import { Menu } from 'devextreme-react/menu';
import { MenuItem } from '../menu-item/menu-item';
import type { MenuItemModel } from '../../../models/menu-item-model';
import type { Item } from 'devextreme/ui/menu';
import { forwardRef, LegacyRef } from 'react';

export type MainMenuProps = {
  items: MenuItemModel[];
  innerRef?: LegacyRef<Menu<any>> | undefined
};

const MainMenuInner = ({ items, innerRef }: MainMenuProps) => {
  return (
    <Menu
      ref={ innerRef }
      className={ 'main-menu' }
      hideSubmenuOnMouseLeave
      items={ items as unknown as Item[] }
      itemRender={ (item) => <MenuItem item={ item } /> }
    />
  );
};

export const MainMenu = forwardRef<Menu<any>, MainMenuProps>((props, ref) =>
  <MainMenuInner { ...props } innerRef={ ref }/>
);
