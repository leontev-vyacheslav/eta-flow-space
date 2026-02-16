import type { IPopupOptions } from "devextreme-react/popup";
import type { SchemaTypeInfoPropertiesChainModel } from "../helpers/data-helper";
import type { AppModalPopupProps } from "./app-modal-popup-props";

export type GraphChartProps = {
    deviceId: number;
    schemaTypeInfos: SchemaTypeInfoPropertiesChainModel[]
    beginDate?: Date;
    endDate?: Date;
};

export type GraphDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & GraphChartProps & {

};
