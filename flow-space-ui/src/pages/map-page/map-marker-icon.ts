import L from "leaflet";
import AppConstants from "../../constants/app-constants";
import type { EmergencyModel } from "../../models/flows/emergency-model";

export const createMapMarkerIcon = (
  emergencyState: EmergencyModel | undefined,
  hasSiblings: boolean = false,
): L.DivIcon => {
  const hasEmergency = !!emergencyState;

  const color =
    hasEmergency &&
    emergencyState?.reasons?.find(
      (r) => r.id === AppConstants.identifiers.connectionEmergencyReasonId,
    )
      ? AppConstants.colors.emergencyCriticalColor
      : hasEmergency
        ? AppConstants.colors.emergencyWarningColor
        : AppConstants.colors.normalDeviceStateColor;

  return L.divIcon({
    className: "",
    html: !hasSiblings
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="36">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z"
                  fill="${color}" stroke="white" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="36">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z"
          fill="${color}" stroke="white" stroke-width="1.5"/>
    <g transform="translate(3.5, 5.5) scale(0.7)">
      <path stroke="black" stroke-width="0.3" fill="white" d="M1.5 7.125c0-1.036.84-1.875 1.875-1.875h6c1.036 0 1.875.84 1.875 1.875v3.75c0 1.036-.84 1.875-1.875 1.875h-6A1.875 1.875 0 0 1 1.5 10.875v-3.75Zm12 1.5c0-1.036.84-1.875 1.875-1.875h5.25c1.035 0 1.875.84 1.875 1.875v8.25c0 1.035-.84 1.875-1.875 1.875h-5.25a1.875 1.875 0 0 1-1.875-1.875v-8.25ZM3 16.125c0-1.036.84-1.875 1.875-1.875h5.25c1.036 0 1.875.84 1.875 1.875v2.25c0 1.035-.84 1.875-1.875 1.875h-5.25A1.875 1.875 0 0 1 3 18.375v-2.25Z" clip-rule="evenodd"></path>
    </g>
</svg>`,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
};
