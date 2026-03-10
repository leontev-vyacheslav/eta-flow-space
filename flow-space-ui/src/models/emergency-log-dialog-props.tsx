import type { IPopupOptions } from "devextreme-react/popup";
import type { AppModalPopupProps } from "./app-modal-popup-props";

export type EmergencyLogProps = {
    deviceId?: number;
    beginDate?: Date;
    endDate?: Date;
};

export type EmergencyLogDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & EmergencyLogProps & {

};
