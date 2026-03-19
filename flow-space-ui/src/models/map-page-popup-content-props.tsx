import type { SchemaTypeInfoPropertiesChainModel } from "../helpers/data-helper";
import type { DeviceModel } from "./flows/device-model";
import type { DeviceStateModel } from "./flows/device-state-model";
import type { EmergencyModel } from "./flows/emergency-model";


export type MapPagePopupContentProps = {
    device: DeviceModel;
    deviceState?: DeviceStateModel;
    dataschema?: any;
    schemaTypeInfoPropertiesChain?: SchemaTypeInfoPropertiesChainModel[];
    emergencyState?: EmergencyModel;
};
