import type { ReactNode } from 'react';
import { type DataGridIconCellValueContainerProps } from '../../models/data-grid-icon-cell-value-container-props';

const DataGridIconCellValueContainer = ({ cellDataFormatter, iconRenderer, rowStyle }: DataGridIconCellValueContainerProps) => {
    const iconProps = { style: {} };
    return (
        <div style={ { ...{ display: 'grid', gridTemplateColumns: '20px 1fr', alignItems: 'center', columnGap: 5 }, ...rowStyle } }>
            { iconRenderer(iconProps) as ReactNode }
            <span>{ cellDataFormatter() }</span>
        </div>
    )
}

export default DataGridIconCellValueContainer;
