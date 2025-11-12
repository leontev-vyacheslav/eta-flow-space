import type { ReactNode } from 'react';
import type { ItemClickEvent } from 'devextreme/ui/menu';

export type MenuItemModel = {
  text?: string;

  items?: MenuItemModel[];

  icon?: (item: MenuItemModel) => ReactNode;

  onClick?: (e: ItemClickEvent) => Promise<void> | void;

  visible?: boolean;

  textColor? : string;
}
