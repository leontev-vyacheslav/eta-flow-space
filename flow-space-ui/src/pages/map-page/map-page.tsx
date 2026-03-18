import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import 'leaflet/dist/leaflet.css';
import './map-page.scss';
import PageHeader from "../../components/page-header/page-header";
import { AdditionalMenuIcon, MapIcon, RefreshIcon } from "../../constants/app-icons";
import AppConstants from "../../constants/app-constants";
import type { MenuItemModel } from "../../models/menu-item-model";
import { useAppData } from "../../contexts/app-data/app-data";
import L from "leaflet";
import { createRoot } from "react-dom/client";
import { MapPagePopupContent } from "./map-page-popup-content";

export const MapPage = () => {
    const defaultCenter: [number, number] = [51.50853, -0.12574];
    const { getDeviceListAsync, getDeviceStateAsync, getDeviceStateDataschemaAsync } = useAppData();
    const mapRef = useRef<L.Map>(null);
    const rootsRef = useRef<Map<number, ReturnType<typeof createRoot>>>(new Map());

    useEffect(() => {

        const fetchData = async () => {
            const devices = await getDeviceListAsync();
            if (!devices || !mapRef.current) {
                return;
            }

            const markersFeatureGroup = L.featureGroup().addTo(mapRef.current);

            devices.forEach(device => {
                if (!device.objectLocation) {
                    return;
                }

                const { latitude, longitude } = device.objectLocation;
                const marker = L.marker([latitude, longitude]).addTo(markersFeatureGroup);
                const container = document.createElement('div');
                const popup = L.popup({ minWidth: 220 }).setContent(container);

                marker.bindPopup(popup);

                marker.on('popupopen', async () => {
                    const [deviceState, dataschema] = await Promise.all([
                        getDeviceStateAsync(device.id),
                        getDeviceStateDataschemaAsync(device.id),
                    ]);

                    if (!deviceState || !dataschema) {
                        return;
                    }

                    if (!rootsRef.current.has(device.id)) {
                        rootsRef.current.set(device.id, createRoot(container));
                    }
                    rootsRef.current.get(device.id)!.render(
                        <MapPagePopupContent device={device} deviceState={deviceState} dataschema={dataschema} />
                    );
                });

                marker.on('popupclose', () => {
                    // Unmount to cancel in-flight requests and free memory
                    rootsRef.current.get(device.id)?.unmount();
                    rootsRef.current.delete(device.id);
                });
            });

            // Fit map to markers bounds if any markers were added
            if (markersFeatureGroup.getLayers().length > 0) {
                mapRef.current.fitBounds(markersFeatureGroup.getBounds(), {
                    padding: [40, 40],
                    maxZoom: 15,
                });
            }

        };
        fetchData();
    }, [getDeviceListAsync, getDeviceStateAsync, getDeviceStateDataschemaAsync]);

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