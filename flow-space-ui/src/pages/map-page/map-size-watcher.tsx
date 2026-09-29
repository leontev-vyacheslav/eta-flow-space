import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Leaflet measures its container once, when the map is created. On a page load straight into the map
// the layout is not final yet, and toggling the side menu resizes the map later; without re-measuring,
// Leaflet only draws tiles for the old size and the rest of the map stays grey.
export const MapSizeWatcher = () => {
    const map = useMap();

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });
        resizeObserver.observe(map.getContainer());

        return () => resizeObserver.disconnect();
    }, [map]);

    return null;
};
