import type { Ref } from 'react';
import ContextMenu from 'devextreme-react/context-menu';
import type { ContextMenuItemItemModel } from './context-menu-item-props';

export type ContextMenuProps = {
  innerRef?: Ref<ContextMenu<ContextMenuItemItemModel>>;

  commands: any;
}
