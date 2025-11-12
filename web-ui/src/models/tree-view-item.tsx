import type { JSX } from 'react';
import type { IconBaseProps } from 'react-icons';

export type TreeViewItemModel = {
  id: string;

  text: string;

  path?: string;

  iconRender: (props: IconBaseProps) => JSX.Element;

  expanded?: boolean;

  command?: string;

  items?: TreeViewItemModel[];

  visible?: boolean;
}
