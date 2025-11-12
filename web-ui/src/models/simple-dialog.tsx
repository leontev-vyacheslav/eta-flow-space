import type { ProcFunc } from './primitive-type';
import type { ReactNode } from 'react';

export type SimpleDialogContentModel = {
  iconName: string;

  iconSize?: number;

  iconColor?: string;

  textRender?: () => ReactNode;
}

export type SimpleDialogModel = SimpleDialogContentModel & {
  title: string;

  callback: ProcFunc | ((props?: any) => Promise<void>);
}

export type PromptSimpleDialogModel = SimpleDialogModel & {
  text?: string;
}
