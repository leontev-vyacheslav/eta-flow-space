import { type JSX, type ReactNode } from 'react';
import { type MenuItemModel } from './menu-item-model';

export type PageHeaderProps = {
  caption: string | (() => JSX.Element);

  children: ReactNode;

  menuItems?: MenuItemModel[];
}
