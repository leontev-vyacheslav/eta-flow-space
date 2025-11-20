import type { DeviceStateModel } from "../../../../models/flows/device-state-model";
import type { PumpingMonitorStateModel } from "./models/pumping-monitor-state-model";
import { PumpingStationStateForm } from "./pumping-station-state-form";

const ControlTabContent = ({ flowUid, deviceState }: { flowUid: string, deviceState: DeviceStateModel }) => {
    return (
        <PumpingStationStateForm state={deviceState.state as PumpingMonitorStateModel} />
    );
}

export default ControlTabContent;