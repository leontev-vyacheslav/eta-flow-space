import { useDashboardPage } from "../../dashboard-page-context";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import type { LeafletMouseEvent } from "leaflet";

import 'leaflet/dist/leaflet.css';


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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { device, deviceState } = useDashboardPage();
    // console.log(device, deviceState);

    const position = device && device.objectLocation ? { lat: device.objectLocation.latitude, lng: device.objectLocation.longitude } : undefined;


    return (

        <div style={{ height: '100%', width: '100%' }}>
            <MapContainer
                center={position}
                zoom={13}
                style={{ height: '100%', width: '100%' }} // Important!
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {
                    position
                        ? <Marker position={position}>
                            <Popup>
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

