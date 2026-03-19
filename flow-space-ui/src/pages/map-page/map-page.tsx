import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer } from "react-leaflet";
import PageHeader from "../../components/page-header/page-header";
import { AdditionalMenuIcon, MapIcon, RefreshIcon } from "../../constants/app-icons";
import AppConstants from "../../constants/app-constants";
import type { MenuItemModel } from "../../models/menu-item-model";
import { useAppData } from "../../contexts/app-data/app-data";
import { MapPagePopupContent } from "./map-page-popup-content";
import type { DeviceModel } from "../../models/flows/device-model";
import type { EmergencyModel } from "../../models/flows/emergency-model";
import { MapPagePopupSkeleton } from "./map-page-popup-skeleton";
import { useLongPress } from "use-long-press";

import 'leaflet/dist/leaflet.css';
import './map-page.scss';

export const MapPage = () => {
    const defaultCenter: [number, number] = [51.50853, -0.12574];
    const { getDeviceListAsync, getDeviceStateAsync, getDeviceStateDataschemaAsync, getEmergencyStatesAsync } = useAppData();
    const mapRef = useRef<L.Map>(null);
    const rootsRef = useRef<Map<number, ReturnType<typeof createRoot>>>(new Map());

    const longPressBinder = useLongPress(
        () => {
            if (mapRef.current) {
                // close all popups
                mapRef.current.closePopup();

                // center by markers bounds
                const markersGroup = L.featureGroup();
                mapRef.current.eachLayer(layer => {
                    if (layer instanceof L.Marker) {
                        markersGroup.addLayer(layer);
                    }
                });

                if (markersGroup.getLayers().length > 0) {
                    mapRef.current.fitBounds(markersGroup.getBounds(), {
                        padding: [40, 40],
                        maxZoom: 14,
                    });
                } else {
                    mapRef.current.setView(defaultCenter, 16, { animate: true });
                }
            }
        }, {
        threshold: 250,
        cancelOnMovement: 5,
        captureEvent: true,
    });

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

    const createMarker = useCallback((color: string) => L.divIcon({
        className: '',
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="36">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z"
                  fill="${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>`,
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36],
    }), []);

    const markerPopupOpenHandler = useCallback(async (device: DeviceModel, emergencyState: EmergencyModel | undefined, container: HTMLElement) => {
        if (!rootsRef.current.has(device.id)) {
            rootsRef.current.set(device.id, createRoot(container));
        }

        const root = rootsRef.current.get(device.id)!;
        root.render(<MapPagePopupSkeleton device={device} />);

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
            <MapPagePopupContent device={device} deviceState={deviceState} dataschema={dataschema} emergencyState={emergencyState} />
        );


    }, [getDeviceStateAsync, getDeviceStateDataschemaAsync]);

    const markerPopupCloseHandler = useCallback((deviceId: number) => {
        rootsRef.current.get(deviceId)?.unmount();
        rootsRef.current.delete(deviceId);
    }, []);

    const buildMarkersAsync = useCallback(async () => {
        const [emergencyStates, devices] = await Promise.all([getEmergencyStatesAsync(), getDeviceListAsync()]);
        if (!devices || !mapRef.current) {
            return;
        }

        const markersFeatureGroup = L.featureGroup().addTo(mapRef.current);

        devices.forEach(device => {
            if (!device.objectLocation) {
                return;
            }

            const { latitude, longitude } = device.objectLocation;
            const emergencyState = emergencyStates?.find(s => s.deviceId === device.id);
            const hasEmergency = !!emergencyState;

            const marker = L.marker([latitude, longitude],
                { icon: createMarker(hasEmergency && emergencyState.reasons.find(r => r.id === 100) ? '#F44336' : (hasEmergency ? '#FFC107' : '#4CAF50')) })
                .addTo(markersFeatureGroup);

            const container = document.createElement('div');
            const popup = L.popup({ minWidth: 220 }).setContent(container);

            marker.bindPopup(popup);
            marker.on('popupopen', markerPopupOpenHandler.bind(null, device, emergencyState, container));
            marker.on('popupclose', markerPopupCloseHandler.bind(null, device.id));
            marker.on('click', () => {
                if (mapRef.current) {
                    const map = mapRef.current;
                    map.setView([latitude, longitude], 14, { animate: true });
                    // Wait for setView animation to finish, then shift down
                    map.once('moveend', () => {
                        map.panBy([0, -50], { animate: true });
                    });
                }
            });
        });

        if (markersFeatureGroup.getLayers().length > 0) {
            mapRef.current.fitBounds(markersFeatureGroup.getBounds(), {
                padding: [40, 40],
                maxZoom: 14,
            });
        }
    }, [getEmergencyStatesAsync, getDeviceListAsync, createMarker, markerPopupOpenHandler, markerPopupCloseHandler]);

    useEffect(() => {
        buildMarkersAsync();
    }, [buildMarkersAsync]);

    return (
        <>
            <PageHeader caption={'Карта объектов'} menuItems={menuItems}>
                <MapIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div {...longPressBinder()} style={{ height: 'calc(100% - 60px)', width: '100%', padding: 10 }}>
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