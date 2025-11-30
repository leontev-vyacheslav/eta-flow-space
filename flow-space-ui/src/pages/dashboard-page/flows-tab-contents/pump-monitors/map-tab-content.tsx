import { useDashboardPage } from "../../dashboard-page-context";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import type { LeafletMouseEvent } from "leaflet";

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from "react";


function MapController() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const map = useMapEvents({
        dblclick: (event: LeafletMouseEvent) => {
            console.log(event);
        }
    });

    return null;
}


const MapTabContent = () => {
    const markerRef = useRef<L.Marker>(null);
    useEffect(() => {
        if (markerRef) {
            const timer = setTimeout(() => {
                markerRef.current?.openPopup();
            }, 100);

            return () => clearTimeout(timer);
        }
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { device, deviceState } = useDashboardPage();
    const position = device && device.objectLocation ? { lat: device.objectLocation.latitude, lng: device.objectLocation.longitude } : undefined;

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
                                A pretty CSS3 popup. <br /> Easily customizable.
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

