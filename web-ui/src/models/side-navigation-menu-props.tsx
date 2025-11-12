import type { ReactNode } from 'react';
import type { ItemClickEvent } from 'devextreme/ui/tree_view';
import type { TreeViewItemModel } from './tree-view-item';
import { type ProcFunc } from './primitive-type';

export type SideNavigationMenuProps = {
  children?: ReactNode;

  selectedItemChanged: (e: ItemClickEvent<TreeViewItemModel>) => void;

  openMenu: ProcFunc;

  compactMode: boolean;

  onMenuReady: ProcFunc;
}
