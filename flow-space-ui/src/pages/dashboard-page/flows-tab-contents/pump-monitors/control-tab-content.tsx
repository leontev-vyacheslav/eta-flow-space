import type { DeviceStateModel } from "../../../../models/flows/device-state-model";
import type { StateModel } from "./models/state-model";
import { ControlForm } from "./control-form";

const ControlTabContent = ({ deviceState }: { deviceState: DeviceStateModel }) => {
    console.log(deviceState);

    return (
        <ControlForm state={deviceState.state as StateModel} />
    );
}

export default ControlTabContent;