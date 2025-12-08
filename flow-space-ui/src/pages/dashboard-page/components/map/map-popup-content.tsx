import { IoLocationOutline } from "react-icons/io5";
import { MdOutlineCheckBox, MdOutlineCheckBoxOutlineBlank } from "react-icons/md";
import { useScreenSize } from "../../../../utils/media-query";
import { useDashboardPage } from "../../dashboard-page-context";

export const MapPopupContent = () => {
    const { isXSmall } = useScreenSize();
    const { deviceState, dataschema, device } = useDashboardPage();

    return (
        <>
            <div className="map-pop-content-location-wrapper" style={{}}>
                <IoLocationOutline size={22} />
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

                                    let valueContent = null;
                                    if (propertyInfo.type === 'boolean') {
                                        if (value === true) {
                                            valueContent = <MdOutlineCheckBox size={14} />
                                        }
                                        if (value === false) {
                                            valueContent = <MdOutlineCheckBoxOutlineBlank size={14} />
                                        }
                                    }
                                    if ((propertyInfo.type === 'integer' || propertyInfo.type === 'float') && value !== undefined) {
                                        valueContent = value
                                    }
                                    return (
                                        !isXSmall ?
                                            <tr key={p}>
                                                <td style={{ width: '250px' }}>{propertyInfo.description}</td>
                                                <td style={{ width: '100px', textAlign: 'center' }}>{valueContent ? valueContent : 'Нет данных'}</td>
                                            </tr> :
                                            <>
                                                <tr>
                                                    <td style={{ width: '250px', fontWeight: '600' }}>{propertyInfo.description}</td>
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