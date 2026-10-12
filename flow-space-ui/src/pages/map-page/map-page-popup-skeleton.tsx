import { IoLocationOutline as LocationIcon } from "react-icons/io5";
import type { DeviceModel } from "../../models/flows/device-model";
import { useAuthStore } from "../../contexts/auth-store";
import { selectIsAdmin } from "../../contexts/auth-selectors";

// Shown while the device data loads. It has the layout and height of the loaded content (the same header row and
// the same fixed-height table area), so the popup does not grow and jump when the data arrives.
export const MapPagePopupSkeleton = ({ device, hasEmergency }: { device: DeviceModel | undefined, hasEmergency?: boolean }) => {
    const isAdmin = useAuthStore(selectIsAdmin);

    return (
        <>
            <div className="map-pop-content-location-wrapper">
                <LocationIcon size={22} />
                <div className="map-pop-content-location">
                    <div style={{ fontWeight: 'bold' }}>{device ? device.description : 'Нет данных'}{device && isAdmin && ` [${device.id}]`}</div>
                    <div>{device && device.objectLocation ? device.objectLocation.address : 'Нет данных'}</div>
                </div>
                {/* the place of the alarm icon, which takes width from the name on narrow screens */}
                {hasEmergency ? <div style={{ width: 18, flexShrink: 0 }} /> : null}
            </div>
            <div className="map-pop-content-wrapper">
                <div className="popup-skeleton">
                    <div className="popup-skeleton__line popup-skeleton__line--title" />
                    <div className="popup-skeleton__line popup-skeleton__line--short" />
                    <div className="popup-skeleton__line popup-skeleton__line--long" />
                    <div className="popup-skeleton__line popup-skeleton__line--short" />
                </div>
            </div>
        </>
    );
};
