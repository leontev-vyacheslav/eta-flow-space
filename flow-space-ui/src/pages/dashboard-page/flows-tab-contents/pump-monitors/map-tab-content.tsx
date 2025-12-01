import { useDashboardPage } from "../../dashboard-page-context";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import type { LeafletMouseEvent } from "leaflet";

import 'leaflet/dist/leaflet.css';
import './map-tab-content.scss';
import { useEffect, useMemo, useRef } from "react";
import { useScreenSize } from "../../../../utils/media-query";
import { IoLocationOutline } from "react-icons/io5";


const MapController = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const map = useMapEvents({
        dblclick: (event: LeafletMouseEvent) => {
            console.log(event);
        }
    });

    return null;
}

const PopupContent = () => {
    const { isXSmall } = useScreenSize();
    const { deviceState, dataschema, device } = useDashboardPage();
    return (
        <>
            <div className="map-pop-content-location-wrapper" style={{  }}>
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
                                    const value = (deviceState as any)[p];
                                    return (
                                        !isXSmall ?
                                            <tr>
                                                <td style={{ width: '250px' }}>{propertyInfo.description}</td>
                                                <td style={{ width: '100px' }}>{value ? value : 'Нет данных'}</td>
                                            </tr> :
                                            <>
                                                <tr>
                                                    <td style={{ width: '250px', fontWeight: '600' }}>{propertyInfo.description}</td>
                                                </tr>
                                                <tr>
                                                    <td>{value ? value : 'Нет данных'}</td>
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

const MapTabContent = () => {
    const markerRef = useRef<L.Marker>(null);
    const { device } = useDashboardPage();

    const position = useMemo(() => {
        return device && device.objectLocation ? { lat: device.objectLocation.latitude, lng: device.objectLocation.longitude } : undefined;
    }, [device]);

    useEffect(() => {
        if (markerRef) {
            const timer = setTimeout(() => {
                markerRef.current?.openPopup();
                //  map.setView(position!, map.getZoom());
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [position]);

    return (

        <div style={{ height: '100%', width: '100%' }}>
            <MapContainer
                center={position}
                zoom={16}
                style={{ height: '100%', width: '100%' }} // Important!
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {
                    position
                        ? <Marker position={position} ref={markerRef}>
                            <Popup closeButton >
                                <PopupContent />
                            </Popup>
                        </Marker>
                        : null
                }
                <MapController />
            </MapContainer>
        </div>
    );
}

export default MapTabContent;

