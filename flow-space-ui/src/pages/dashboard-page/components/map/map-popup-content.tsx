import { useCallback } from "react";

import { useScreenSize } from "../../../../utils/media-query";
import { useDashboardPage } from "../../dashboard-page-context";
import { CheckedIcon, LocationIcon, UncheckedIcon } from "../../../../constants/app-icons";

export const MapPopupContent = () => {
    const { isXSmall } = useScreenSize();
    const { deviceState, dataschema, device } = useDashboardPage();

    const provideStateValue = useCallback((propertyInfo: any, value: any) => {
        if (propertyInfo.type === 'boolean') {
            if (value === true) {
                return <CheckedIcon size={14} />
            }
            if (value === false) {
                return <UncheckedIcon size={14} />
            }
        }

        if (propertyInfo.format !== 'date-time' && (propertyInfo.type === 'integer' || propertyInfo.type === 'float') && value !== undefined) {
            return value;
        }

        if (propertyInfo.format === 'date-time' && value !== undefined) {
            if (propertyInfo.type === 'integer') {
                return (new Date(value)).toLocaleString('ru-RU', {});
            } else if (propertyInfo.type === 'string') {
                return (new Date(Date.parse(value))).toLocaleString('ru-RU', {});
            }
        }
        return null;
    }, []);

    return (
        <>
            <div className="map-pop-content-location-wrapper" style={{}}>
                <LocationIcon size={22} />
                <div className="map-pop-content-location">
                    <div>{device ? device.description : 'Нет данных'}</div>
                    <div>{device && device.objectLocation ? device.objectLocation.address : 'Нет данных'}</div>
                </div>
            </div>
            <div className="map-pop-content-wrapper">
                <table className="simple-grid" style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            {
                                !isXSmall
                                    ? <><th>Параметр</th><th>Значение</th></>
                                    : <th>Параметр/значение</th>
                            }
                        </tr>
                    </thead>
                    <tbody>
                        {
                            Object.keys(dataschema.properties)
                                .filter(p => !p.startsWith('_'))
                                .map(p => {
                                    const propertyInfo = dataschema.properties[p];
                                    const value = (deviceState?.state as any)[p];
                                    const valueContent = provideStateValue(propertyInfo, value);

                                    return (
                                        !isXSmall ?
                                            <tr key={p}>
                                                <td style={{ width: '250px' }}>{propertyInfo.ui.label.text}</td>
                                                <td style={{ width: '120px', textAlign: 'center' }}>{valueContent ? valueContent : 'Нет данных'}</td>
                                            </tr> :
                                            <>
                                                <tr>
                                                    <td style={{ width: '250px', fontWeight: '600' }}>{propertyInfo.ui.label.text}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ marginLeft: '10px' }}>{valueContent ? valueContent : 'Нет данных'}</td>
                                                </tr>
                                            </>
                                    )
                                })
                        }
                    </tbody>
                </table>
            </div>
        </>
    );
}