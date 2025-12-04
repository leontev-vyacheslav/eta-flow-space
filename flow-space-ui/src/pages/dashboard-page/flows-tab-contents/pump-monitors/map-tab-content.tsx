import { useDashboardPage } from "../../dashboard-page-context";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import type { LeafletMouseEvent } from "leaflet";

import 'leaflet/dist/leaflet.css';
import './map-tab-content.scss';
import { useEffect, useMemo, useRef, useState } from "react";
import { useScreenSize } from "../../../../utils/media-query";
import { IoLocationOutline } from "react-icons/io5";
import { MdOutlineCheckBox, MdOutlineCheckBoxOutlineBlank } from "react-icons/md";


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

const NoDataOverlay = () => {
    return (
        <div className="leaflet-middle leaflet-center leaflet-control"
            style={{
                position: 'absolute',
                zIndex: 1000,
                pointerEvents: 'none',
                top: '50%',
                left: '50%',
                fontSize: `14px`,
                transform: 'translate(-50%, -50%)',
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '20px 50px',
            }}>
            <div className="leaflet-control leaflet-bar" style={{ border: 'none' }}>Нет данных</div>
        </div>
    );
}

const MapTabContent = () => {
    const map = useRef<L.Map>(null);
    const markerRef = useRef<L.Marker>(null);
    const { device } = useDashboardPage();
    const [isEnable, setIsEnable] = useState<boolean>(true);
    const defaultCenter: [number, number] = [51.50853, -0.12574];

    const position = useMemo(() => {
        return device && device.objectLocation ? { lat: device.objectLocation.latitude, lng: device.objectLocation.longitude } : null;
    }, [device]);

    useEffect(() => {
        if (markerRef && map) {
            const timer = setTimeout(() => {
                if (map && map.current && position) {
                    map.current.setView(position, map.current.getZoom());
                }
                if (map && map.current) {
                    if (isEnable) {
                        map.current.dragging.enable();
                        map.current.scrollWheelZoom.enable();
                        map.current.doubleClickZoom.enable();
                    }
                    else {
                        map.current.dragging.disable();
                        map.current.scrollWheelZoom.disable();
                        map.current.doubleClickZoom.disable();
                    }
                    const mapEl = map.current.getContainer();
                    mapEl.style.opacity = isEnable ? "1" : "0.7";
                }

                markerRef.current?.openPopup();
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [position, map, isEnable]);

    useEffect(() => {
        const hasValidPosition = position !== null;
        setIsEnable(hasValidPosition);
    }, [position]);

    return (
        <div style={{ height: '100%', width: '100%', }}>
            <MapContainer
                ref={map}
                center={position ?? defaultCenter}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {
                    isEnable
                        ? <Marker position={position ?? defaultCenter} ref={markerRef}>
                            <Popup closeButton >
                                <PopupContent />
                            </Popup>
                        </Marker>
                        : <NoDataOverlay />
                }
                <MapController />
            </MapContainer>
        </div>
    );
}

export default MapTabContent;

