import '../main-menu.css';
import { Menu } from 'devextreme-react/menu';
import { MenuItem } from '../menu-item/menu-item';
import type { MenuItemModel } from '../../../models/menu-item-model';
import type { Item } from 'devextreme/ui/menu';
import { forwardRef, type LegacyRef } from 'react';

export type MainMenuProps = {
  className?: string;
  disabled?: boolean;
  items: MenuItemModel[];
  innerRef?: LegacyRef<Menu<any>> | undefined
};

const MainMenuInner = ({ items, innerRef, disabled, className }: MainMenuProps) => {
  return (
    <Menu
      ref={innerRef}
      className={className}
      disabled={disabled}
      hideSubmenuOnMouseLeave
      items={items as unknown as Item[]}
      itemRender={(item) => <MenuItem item={item} />}
    />
  );
};

export const MainMenu = forwardRef<Menu<any>, MainMenuProps>((props, ref) =>
  <MainMenuInner {...props} className={`main-menu ${props.className}`} innerRef={ref} />
);
