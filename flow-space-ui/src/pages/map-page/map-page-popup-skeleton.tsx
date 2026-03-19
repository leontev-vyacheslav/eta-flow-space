import { IoLocationOutline as LocationIcon } from "react-icons/io5";
import type { DeviceModel } from "../../models/flows/device-model";

export const MapPagePopupSkeleton = ({ device }: { device: DeviceModel | undefined; }) => (
    <>
        <LocationIcon size={22} />
        <div className="map-pop-content-location">
            <div style={{ fontWeight: 'bold' }}>{device ? device.description : 'Нет данных'}</div>
            <div>{device && device.objectLocation ? device.objectLocation.address : 'Нет данных'}</div>
        </div>

        <div className="popup-skeleton">
            <div className="popup-skeleton__line popup-skeleton__line--title" />
            <div className="popup-skeleton__line popup-skeleton__line--short" />
            <div className="popup-skeleton__line popup-skeleton__line--long" />
            <div className="popup-skeleton__line popup-skeleton__line--short" />
        </div>
    </>
);
