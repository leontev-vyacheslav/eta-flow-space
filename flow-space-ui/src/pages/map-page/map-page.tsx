import { useMemo, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import './map-page.scss';
import PageHeader from "../../components/page-header/page-header";
import { AdditionalMenuIcon, MapIcon, RefreshIcon } from "../../constants/app-icons";
import AppConstants from "../../constants/app-constants";
import type { MenuItemModel } from "../../models/menu-item-model";

export const MapPage = () => {
    const mapRef = useRef<L.Map>(null);
    const defaultCenter: [number, number] = [51.50853, -0.12574];

    const menuItems = useMemo(() => {
        return [
            {
                icon: () => <AdditionalMenuIcon size={20} color='black' />,
                items: [
                    {
                        icon: () => <RefreshIcon size={20} />,
                        text: 'Обновить...',
                        onClick: () => {
                            // setRefreshToken(getQuickGuid());
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
    }, []);

    return (
        <>
            <PageHeader caption={'Карта объектов'} menuItems={menuItems}>
                <MapIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div style={{ height: 'calc(100% - 60px)', width: '100%', padding: 10 }}>
                <MapContainer
                    ref={mapRef}
                    center={defaultCenter}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                </MapContainer>
            </div>
        </>
    );
}