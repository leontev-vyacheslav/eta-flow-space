import type { ProcFunc } from './primitive-type';
import { type RefObject } from 'react';
import TreeView from 'devextreme-react/tree-view';
import type { TreeViewItemModel } from './tree-view-item';

export type SharedAreaContextModel = {
  signOutWithConfirm: ProcFunc;
  treeViewRef: RefObject<TreeView<TreeViewItemModel>>;
  showLoader: ProcFunc;
  hideLoader: ProcFunc;
  // disposedTimerDispatcher: MutableRefObject<DisposedTimersDispatcher>;
};
