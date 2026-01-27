import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useEffect, useMemo, useRef, useState } from "react";
import { useDashboardPage } from '../../dashboard-page-context';
import { MapEventController } from './map-event-controller';
import { MapNoDataOverlay } from './map-no-data-overlay';
import { MapPopupContent } from './map-popup-content';

import 'leaflet/dist/leaflet.css';
import './map.scss';

export const Map = () => {
    const { device, isValidDeviceState } = useDashboardPage();
    const [isEnable, setIsEnable] = useState<boolean>(true);
    const mapRef = useRef<L.Map>(null);
    const markerRef = useRef<L.Marker>(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const defaultCenter: [number, number] = [51.50853, -0.12574];

    const position = useMemo(() => {
        return device && device.objectLocation ? { lat: device.objectLocation.latitude, lng: device.objectLocation.longitude } : null;
    }, [device]);

    useEffect(() => {
        const hasValidPosition = (position !== null);
        setIsEnable(hasValidPosition);
    }, [isValidDeviceState, position]);

    useEffect(() => {

        if (markerRef && mapRef) {
            const timer = setTimeout(() => {
                if (!mapRef || !mapRef.current) {
                    return;
                }
                if (position) {
                    mapRef.current.setView(position, mapRef.current.getZoom());
                }

                if (isEnable) {
                    mapRef.current.dragging.enable();
                    mapRef.current.scrollWheelZoom.enable();
                    mapRef.current.doubleClickZoom.enable();
                }
                else {
                    mapRef.current.dragging.disable();
                    mapRef.current.scrollWheelZoom.disable();
                    mapRef.current.doubleClickZoom.disable();
                }

                const mapElement = mapRef.current.getContainer();
                mapElement.style.opacity = (isValidDeviceState ? 1 : 0.7).toString();

                // how to center popup
                markerRef.current?.openPopup();

                if (position) {
                    mapRef.current.setView(position, mapRef.current.getZoom());
                }
            }, 100);

            return () => {
                clearTimeout(timer)
            };
        }
    }, [position, mapRef, isEnable, defaultCenter, isValidDeviceState]);

    return (
        <div style={{ height: '100%', width: '100%', paddingBottom: 30 }}>
            <MapContainer
                ref={mapRef}
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
                                    <MapPopupContent />
                                </Popup>
                        </Marker>
                        : <MapNoDataOverlay />
                }
                <MapEventController position={position} markerRef={markerRef} />
            </MapContainer>
        </div>
    );
}

