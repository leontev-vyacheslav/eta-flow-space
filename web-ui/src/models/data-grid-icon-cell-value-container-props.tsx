import type { CSSProperties, FunctionComponent, ReactNode } from 'react';
import type { IconBaseProps } from 'react-icons';

export type DataGridIconCellValueContainerProps = {
  cellDataFormatter: () => ReactNode;

  iconRenderer: FunctionComponent<IconBaseProps>;

  rowStyle?: CSSProperties;
}
