import type { DeviceStateModel } from "../../../../models/flows/device-state-model";

const MapTabContent = ({ flowUid, deviceState }: { flowUid: string, deviceState: DeviceStateModel }) => {
    return (
        <>
            <h3>Map</h3>
            {deviceState
                ? <>Flow={flowUid}, Device={deviceState.deviceId} DeviceState=${JSON.stringify(deviceState.state)}</>
                : null
            }
        </>
    );
}

export default MapTabContent;

