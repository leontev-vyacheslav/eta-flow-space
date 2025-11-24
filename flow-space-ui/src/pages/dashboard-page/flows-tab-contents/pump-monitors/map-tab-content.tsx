import type { DeviceStateModel } from "../../../../models/flows/device-state-model";

const MapTabContent = ({ deviceState }: { deviceState: DeviceStateModel }) => {
    console.log(deviceState);

    return (
        <>
            <h3>Map</h3>
            {deviceState
                ? <>Device={deviceState.deviceId} DeviceState=${JSON.stringify(deviceState.state)}</>
                : null
            }
        </>
    );
}

export default MapTabContent;

