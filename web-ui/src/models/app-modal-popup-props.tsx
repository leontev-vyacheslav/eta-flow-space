import type { ReactNode } from 'react';
import type { PopupCallbackModel } from './popup-callback';

export type AppModalPopupProps = {
  title?: string;

  children?: ReactNode;

  callback: ({ ...any }: PopupCallbackModel) => void;
}
