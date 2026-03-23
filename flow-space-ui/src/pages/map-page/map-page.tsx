import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { isSuppressedForLongPress } from "../../helpers/map-helpers";
import { createMapMarkerIcon } from "./map-marker-icon";
import { getQuickGuid } from "../../utils/uuid";

import 'leaflet/dist/leaflet.css';
import './map-page.scss';

export const MapPage = () => {
    const { getDeviceListAsync, getDeviceStateAsync, getDeviceStateDataschemaAsync, getEmergencyStatesAsync } = useAppData();
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const mapRef = useRef<L.Map>(null);
    const markersGroupRef = useRef<L.FeatureGroup | null>(null);
    const rootsRef = useRef<Map<number, ReturnType<typeof createRoot>>>(new Map());
    const latestRequestRef = useRef<number>(0);

    const longPressBinder = useLongPress(
        () => {
            if (mapRef.current) {
                // close all popups
                mapRef.current.closePopup();

                // center by markers bounds
                if (!markersGroupRef.current) {
                    return;
                }
                const markersGroup = markersGroupRef.current!;

                if (markersGroup.getLayers().length > 0) {
                    mapRef.current.fitBounds(markersGroup.getBounds(), AppConstants.mapDefaultBoundsSetting as L.FitBoundsOptions);
                } else {
                    mapRef.current.setView(AppConstants.mapDefaultCenter, AppConstants.mapDefaultZoom, { animate: true });
                }
            }
        }, {
        threshold: 250,
        cancelOnMovement: 5,
        captureEvent: true,
        filterEvents: (e) => !isSuppressedForLongPress(e.target as HTMLElement),
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
                            setRefreshToken(getQuickGuid());
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
    }, []);

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

        rootsRef.current.get(device.id)?.render(
            <MapPagePopupContent device={device} deviceState={deviceState} dataschema={dataschema} emergencyState={emergencyState} />
        );

    }, [getDeviceStateAsync, getDeviceStateDataschemaAsync]);

    const markerPopupCloseHandler = useCallback((deviceId: number) => {
        const root = rootsRef.current.get(deviceId);
        if (root) {
            // Defer unmount to avoid race condition with React's render cycle
            queueMicrotask(() => {
                root.unmount();
                rootsRef.current.delete(deviceId);
            });
        }
    }, []);

    const markerClickHandler = useCallback(([latitude, longitude]: [number, number]) => {
        if (mapRef.current) {
            const map = mapRef.current;
            map.setView([latitude, longitude], AppConstants.mapDefaultZoom, { animate: true });
            // Wait for setView animation to finish, then shift down
            map.once('moveend', () => {
                map.panBy([0, -50], { animate: true });
            });
        }
    }, []);

    const buildMarkersAsync = useCallback(async () => {
        const requestId = ++latestRequestRef.current;
        const [emergencyStates, devices] = await Promise.all([getEmergencyStatesAsync(), getDeviceListAsync()]);
        if (requestId !== latestRequestRef.current) {
            return;
        }

        if (!devices || !mapRef.current) {
            return;
        }

        markersGroupRef.current?.remove();

        const markersFeatureGroup = L.featureGroup().addTo(mapRef.current);
        markersGroupRef.current = markersFeatureGroup;

        devices.forEach(device => {
            if (!device.objectLocation) {
                return;
            }

            const { latitude, longitude } = device.objectLocation;
            const emergencyState = emergencyStates?.find(s => s.deviceId === device.id);

            const marker = L.marker([latitude, longitude], {
                icon: createMapMarkerIcon(emergencyState)
            }).addTo(markersFeatureGroup);

            const container = document.createElement('div');
            const popup = L.popup({ minWidth: 220 }).setContent(container);

            marker.bindPopup(popup);
            marker.on('popupopen', () => {
                markerPopupOpenHandler(device, emergencyState, container)
            });
            marker.on('popupclose', () => {
                markerPopupCloseHandler(device.id)
            });
            marker.on('click', () => {
                markerClickHandler([latitude, longitude]);
            });
        });

        if (markersFeatureGroup.getLayers().length > 0) {
            mapRef.current?.fitBounds(markersFeatureGroup.getBounds(), AppConstants.mapDefaultBoundsSetting as L.FitBoundsOptions);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getEmergencyStatesAsync, getDeviceListAsync, markerPopupOpenHandler, markerPopupCloseHandler, markerClickHandler, refreshToken]);

    useEffect(() => {
        buildMarkersAsync();
    }, [buildMarkersAsync]);

    useEffect(() => {
        const map = mapRef.current;
        const markersGroup = markersGroupRef.current;
        const roots = rootsRef.current;

        return () => {
            markersGroup?.remove();
            map?.remove();

            // Clean up all React roots (deferred to avoid race condition)
            roots.forEach(root => {
                for (const [key, value] of roots) {
                    if (value === root) {
                        queueMicrotask(() => {
                            root.unmount();
                            roots.delete(key);
                        });
                        break;
                    }
                }
            });
        };
    }, []);

    return (
        <>
            <PageHeader caption={'Карта объектов'} menuItems={menuItems}>
                <MapIcon size={AppConstants.headerIconSize} />
            </PageHeader>
            <div {...longPressBinder()} style={{ height: 'calc(100% - 60px)', width: '100%', padding: 10 }}>
                <MapContainer
                    ref={mapRef}
                    center={AppConstants.mapDefaultCenter}
                    zoom={AppConstants.mapDefaultZoom}
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