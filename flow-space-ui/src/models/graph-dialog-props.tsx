import type { IPopupOptions } from "devextreme-react/popup";
import type { SchemaTypeInfoPropertiesChainModel } from "../helpers/data-helper";
import type { AppModalPopupProps } from "./app-modal-popup-props";
export type GraphProps = {
    deviceId: number;
    beginDate?: Date;
    endDate?: Date;
};

export type GraphChartProps = GraphProps & {
    schemaTypeInfo: SchemaTypeInfoPropertiesChainModel
};

export type GraphDialogProps = React.PropsWithChildren<IPopupOptions> & AppModalPopupProps & GraphProps & {
    schemaTypeInfos: SchemaTypeInfoPropertiesChainModel[]
};
