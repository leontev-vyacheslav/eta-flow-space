import { formatMessage } from "devextreme/localization";

export const NoData = () => {
    return (
        <div className='dx-widget dx-nodata' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div>{formatMessage('noDataText')}</div>
        </div>
    );
};
