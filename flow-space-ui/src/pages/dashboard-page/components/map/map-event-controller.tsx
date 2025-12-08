import type { LatLngExpression, LeafletMouseEvent } from "leaflet";
import type { RefObject } from "react";
import { useMapEvents } from "react-leaflet";

export const MapEventController = ({ position, markerRef }: { position: LatLngExpression | undefined | null; markerRef: RefObject<L.Marker<any> | null>; }) => {
    const map = useMapEvents({
        contextmenu: (event: LeafletMouseEvent) => {
            event.originalEvent.preventDefault();
            event.originalEvent.stopPropagation();
        },
        mousedown: (event: LeafletMouseEvent) => {
            if (!position) {
                return;
            }
            if (event.originalEvent.button === 2) {
                map.setView(position, map.getZoom());
                markerRef.current?.openPopup();
            }
        }
    });

    return null;
};
