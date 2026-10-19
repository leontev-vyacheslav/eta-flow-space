import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MapContainer, TileLayer } from "react-leaflet";
import PageHeader from "../../components/page-header/page-header";
import { AdditionalMenuIcon, HelpIcon, MapIcon, RefreshIcon } from "../../constants/app-icons";
import { quickHelpReferenceService } from "../../components/dialogs/quick-reference-help-dialog/quick-reference-help-service";
import AppConstants from "../../constants/app-constants";
import type { MenuItemModel } from "../../models/menu-item-model";
import { useAppData } from "../../contexts/app-data/app-data";
import type { DeviceModel } from "../../models/flows/device-model";
import type { EmergencyModel } from "../../models/flows/emergency-model";
import { MapPageDevicePopup, type MapPageDeviceData } from "./map-page-device-popup";
import { useLongPress } from "use-long-press";
import { isSuppressedForLongPress } from "../../helpers/map-helpers";
import { createMapMarkerIcon } from "./map-marker-icon";
import { getQuickGuid } from "../../utils/uuid";
import { useNavigate, useParams } from "react-router";
import { useSharedArea } from "../../contexts/shared-area";
import { MapMarkerIconEmergencyTypes } from "../../models/enums/map-icon-emergency-types";
import { MapSizeWatcher } from "./map-size-watcher";


import 'leaflet/dist/leaflet.css';
import './map-page.scss';

type MarkerGroup = {
    key: string;
    devices: DeviceModel[];
    // the device shown in the popup
    index: number;
    container: HTMLElement;
    emergencyStates: EmergencyModel[] | undefined;
    // keeps the popup inside the map when its content grows (data loaded, another device shown)
    resizeObserver?: ResizeObserver;
};

// Leaflet pans a popup into view only when it opens; this re-measures it and pans the map if it sticks out
const fitPopupIntoView = (marker: L.Marker) => {
    const popup = marker.getPopup();
    if (popup?.isOpen()) {
        popup.update();
    }
};

export const MapPage = () => {
    const navigate = useNavigate();
    const { deviceId } = useParams();
    const { getDeviceListAsync, getDeviceStatesAsync, getEmergencyStatesAsync, getDeviceStateDataschemaAsync } = useAppData();
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    // tiles are requested only once the map is positioned (fit to the markers or zoomed to a device);
    // before that it sits at the default centre, whose tiles would be downloaded and thrown away
    const [tilesReady, setTilesReady] = useState(false);
    const mapRef = useRef<L.Map>(null);
    const markersGroupRef = useRef<L.FeatureGroup | null>(null);
    // devices at the same place in the same flow (a boiler room and its meters) share one marker,
    // whose popup pages between them; both maps are keyed by device id, all devices of a group point to it
    const rootsRef = useRef<Map<string, ReturnType<typeof createRoot>>>(new Map());
    const markersRef = useRef<Map<number, L.Marker>>(new Map());
    const groupsRef = useRef<Map<number, MarkerGroup>>(new Map());
    const latestRequestRef = useRef<number>(0);
    const { treeViewRef } = useSharedArea();

    // close popups and fit the view to all markers
    const showAllMarkers = useCallback(() => {
        const map = mapRef.current;
        const markersGroup = markersGroupRef.current;
        if (!map || !markersGroup) {
            return;
        }

        map.closePopup();
        if (markersGroup.getLayers().length > 0) {
            map.fitBounds(markersGroup.getBounds(), AppConstants.mapDefaultBoundsSetting as L.FitBoundsOptions);
        } else {
            map.setView(AppConstants.mapDefaultCenter, AppConstants.mapDefaultZoom, { animate: true });
        }
    }, []);

    const longPressBinder = useLongPress(
        () => {
            if (mapRef.current) {
                showAllMarkers();
                setTimeout(() => {
                    const path = `/map`;
                    navigate(path);
                    const navigationItem = document.querySelector(`li[data-item-id="${path}"]`);
                    if (navigationItem) {
                        treeViewRef.current?.instance.selectItem(navigationItem);
                    }
                }, 500);
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
                    {
                        icon: () => <HelpIcon size={20} />,
                        text: 'Справка...',
                        onClick: () => {
                            quickHelpReferenceService.show({ referenceKey: 'common/map' });
                        }
                    },
                ]
            }
        ] as MenuItemModel[];
    }, []);

    const loadDeviceData = useCallback(async (device: DeviceModel): Promise<MapPageDeviceData | undefined> => {
        if (!device.flow?.code) {
            return;
        }

        const [deviceStates, dataschema] = await Promise.all([
            getDeviceStatesAsync(device.id),
            getDeviceStateDataschemaAsync(device.code),
        ]);
        if (!deviceStates || !dataschema) {
            return;
        }

        return { deviceState: deviceStates[device.code], dataschema };
    }, [getDeviceStatesAsync, getDeviceStateDataschemaAsync]);

    // the route and the side menu follow the device shown in a popup
    const selectDevice = useCallback((device: DeviceModel) => {
        const path = `/map/${device.flow?.code}/device/${device.id}`;
        navigate(path);
        const navigationItem = document.querySelector(`li[data-item-id="${path}"]`);
        if (navigationItem) {
            treeViewRef.current?.instance.selectItem(navigationItem);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [treeViewRef]);

    const renderGroupPopup = useCallback((group: MarkerGroup) => {
        if (!rootsRef.current.has(group.key)) {
            rootsRef.current.set(group.key, createRoot(group.container));
        }
        const root = rootsRef.current.get(group.key)!;
        const render = () => root.render(
            <MapPageDevicePopup
                devices={group.devices}
                index={group.index}
                emergencyStates={group.emergencyStates}
                loadDeviceData={loadDeviceData}
                onIndexChange={(index) => {
                    group.index = index;
                    render();
                    selectDevice(group.devices[index]);
                }} />
        );
        render();
    }, [loadDeviceData, selectDevice]);

    const groupPopupCloseHandler = useCallback((group: MarkerGroup) => {
        // the next click on the marker starts again with the first device
        group.index = 0;
        const root = rootsRef.current.get(group.key);
        if (root) {
            // Defer unmount to avoid race condition with React's render cycle
            queueMicrotask(() => {
                root.unmount();
                rootsRef.current.delete(group.key);
            });
        }
    }, []);

    const markerClickHandler = useCallback(({ group, marker, latitude, longitude }: { group: MarkerGroup, marker: L.Marker, latitude: number, longitude: number }) => {
        if (mapRef.current) {
            const map = mapRef.current;
            map.setView([latitude, longitude], AppConstants.mapDefaultZoom, { animate: false });
            // Wait for setView animation to finish, then shift down
            map.once('moveend', () => {
                map.panBy([0, -50], { animate: true });
                map.once('moveend', () => fitPopupIntoView(marker));
            });
        }
        selectDevice(group.devices[group.index]);
    }, [selectDevice]);

    const showPopup = useCallback((deviceId: string | undefined) => {
        if (!deviceId || !mapRef.current) {
            return;
        }

        const targetDeviceId = parseInt(deviceId, 10);
        if (isNaN(targetDeviceId)) {
            return;
        }

        const marker = markersRef.current.get(targetDeviceId);
        const group = groupsRef.current.get(targetDeviceId);
        if (!marker || !group) {
            return;
        }

        const index = group.devices.findIndex(d => d.id === targetDeviceId);
        if (marker.isPopupOpen()) {
            // already open (paging in the popup, or a click on the marker): show that device, keep the map still
            if (group.index !== index) {
                group.index = index;
                renderGroupPopup(group);
            }
            return;
        }
        group.index = index;

        const latLng = marker.getLatLng();
        mapRef.current.setView([latLng.lat, latLng.lng], AppConstants.mapDefaultZoom, { animate: true });

        mapRef.current.once('moveend', () => {
            marker.openPopup();
            mapRef.current?.panBy([0, -50], { animate: true });
            mapRef.current?.once('moveend', () => fitPopupIntoView(marker));
        });
    }, [renderGroupPopup]);

    const buildMarkersAsync = useCallback(async () => {
        const requestId = ++latestRequestRef.current;
        const [emergencyStates, devices] = await Promise.all([getEmergencyStatesAsync(), getDeviceListAsync()]);
        if (requestId !== latestRequestRef.current) {
            return;
        }

        if (!devices || !mapRef.current) {
            // no device list: show the map at the default centre rather than leaving it empty
            setTilesReady(true);
            return;
        }

        markersGroupRef.current?.remove();

        const markersFeatureGroup = L.featureGroup().addTo(mapRef.current);
        markersGroupRef.current = markersFeatureGroup;

        markersRef.current.clear();
        new Set(groupsRef.current.values()).forEach(group => group.resizeObserver?.disconnect());
        groupsRef.current.clear();

        // devices of one flow at one place share a marker; the list's order (boiler room first) is kept
        const groups = new Map<string, MarkerGroup>();
        devices.forEach(device => {
            if (!device.objectLocation) {
                return;
            }
            const { latitude, longitude } = device.objectLocation;
            const key = `${device.flowId}:${latitude}:${longitude}`;
            if (!groups.has(key)) {
                groups.set(key, { key, devices: [], index: 0, container: document.createElement('div'), emergencyStates });
            }
            groups.get(key)!.devices.push(device);
        });

        groups.forEach(group => {
            const { latitude, longitude } = group.devices[0].objectLocation!;
            const groupEmergencyStates = emergencyStates?.filter(s => group.devices.some(d => d.id === s.deviceId)) ?? [];

            // red when a device of the group lost the connection, yellow when any of them has an alarm
            let mapIconEmergencyType = MapMarkerIconEmergencyTypes.Normal;
            if (groupEmergencyStates.some(s => s.reasons?.some(r => r.id === AppConstants.identifiers.connectionEmergencyReasonId))) {
                mapIconEmergencyType = MapMarkerIconEmergencyTypes.Critical;
            } else if (groupEmergencyStates.length > 0) {
                mapIconEmergencyType = MapMarkerIconEmergencyTypes.Warning;
            }

            const marker = L.marker([latitude, longitude], {
                icon: createMapMarkerIcon(mapIconEmergencyType, group.devices.length > 1)
            }).addTo(markersFeatureGroup);

            group.devices.forEach(device => {
                markersRef.current.set(device.id, marker);
                groupsRef.current.set(device.id, group);
            });

            const popup = L.popup({
                minWidth: 220,
                autoClose: true,
                closeOnClick: false,
                closeOnEscapeKey: false

            }).setContent(group.container);

            marker.bindPopup(popup);
            let lastHeight = 0;
            group.resizeObserver = new ResizeObserver(([entry]) => {
                const height = Math.round(entry.contentRect.height);
                if (height !== lastHeight) {
                    lastHeight = height;
                    fitPopupIntoView(marker);
                }
            });
            group.resizeObserver.observe(group.container);
            marker.on('popupopen', () => {
                renderGroupPopup(group);
            });
            marker.on('popupclose', () => {
                groupPopupCloseHandler(group);
            });
            marker.on('click', () => {
                markerClickHandler({ group, marker, latitude, longitude });
            });
        });

        if (!deviceId) {
            if (markersFeatureGroup.getLayers().length > 0) {
                mapRef.current?.fitBounds(markersFeatureGroup.getBounds(), AppConstants.mapDefaultBoundsSetting as L.FitBoundsOptions);
            }
        } else {
            showPopup(deviceId);
        }
        setTilesReady(true);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getEmergencyStatesAsync, getDeviceListAsync, renderGroupPopup, groupPopupCloseHandler, markerClickHandler, refreshToken]);

    useEffect(() => {
        buildMarkersAsync();
    }, [buildMarkersAsync]);

    // Open popup for specific deviceId after markers are built; back on /map show all markers
    // (the page stays mounted when switching between the map routes)
    useEffect(() => {
        if (deviceId) {
            showPopup(deviceId);
        } else {
            showAllMarkers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId]);

    useEffect(() => {
        const map = mapRef.current;
        const markersGroup = markersGroupRef.current;
        const roots = rootsRef.current;
        const groups = groupsRef.current;

        return () => {
            new Set(groups.values()).forEach(group => group.resizeObserver?.disconnect());
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
            <div {...longPressBinder()} style={{ height: '100%', width: '100%', padding: 5 }}>
                <MapContainer
                    ref={mapRef}
                    center={AppConstants.mapDefaultCenter}
                    zoom={AppConstants.mapDefaultZoom}
                    style={{ height: 'calc(100% - 50px)', width: '100%', }}>
                    {tilesReady
                        ? <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        : null}
                    <MapSizeWatcher />
                </MapContainer>
            </div>
        </>
    );
}