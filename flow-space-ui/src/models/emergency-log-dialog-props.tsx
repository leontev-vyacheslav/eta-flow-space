import type { IPopupOptions } from "devextreme-react/popup";
import type { AppModalPopupProps } from "./app-modal-popup-props";
import type { DeviceModel } from "./flows/device-model";

export type EmergencyLogProps = {
    device?: DeviceModel;
    beginDate?: Date;
    endDate?: Date;
};

export type EmergencyLogDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & EmergencyLogProps & {

};
