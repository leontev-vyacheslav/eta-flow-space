import L from "leaflet";
import AppConstants from "../../constants/app-constants";
import type { EmergencyModel } from "../../models/flows/emergency-model";


export const createMapMarkerIcon = (emergencyState: EmergencyModel | undefined): L.DivIcon => {

    const hasEmergency = !!emergencyState;

    const color = hasEmergency && emergencyState?.reasons?.find(r => r.id === AppConstants.identifiers.connectionEmergencyReasonId)
        ? AppConstants.colors.emergencyCriticalColor
        : hasEmergency
            ? AppConstants.colors.emergencyWarningColor
            : AppConstants.colors.normalDeviceStateColor;

    return L.divIcon({
        className: '',
        html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="36">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z"
                  fill="${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>`,
        iconSize: [24, 36],
        iconAnchor: [12, 36],
        popupAnchor: [0, -36],
    });
};
