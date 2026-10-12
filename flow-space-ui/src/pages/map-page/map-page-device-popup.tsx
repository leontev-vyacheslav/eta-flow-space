import { useEffect, useState } from "react";
import { Button } from "devextreme-react/button";
import { NextIcon, PreviousIcon } from "../../constants/app-icons";
import type { DeviceModel } from "../../models/flows/device-model";
import type { EmergencyModel } from "../../models/flows/emergency-model";
import { MapPagePopupContent } from "./map-page-popup-content";
import { MapPagePopupSkeleton } from "./map-page-popup-skeleton";

export type MapPageDeviceData = { deviceState: any, dataschema: any };

type MapPageDevicePopupProps = {
    // the devices sharing one marker (a boiler room and its meters), in the order of the device list
    devices: DeviceModel[];
    index: number;
    onIndexChange: (index: number) => void;
    emergencyStates: EmergencyModel[] | undefined;
    loadDeviceData: (device: DeviceModel) => Promise<MapPageDeviceData | undefined>;
};

export const MapPageDevicePopup = ({ devices, index, onIndexChange, emergencyStates, loadDeviceData }: MapPageDevicePopupProps) => {
    const device = devices[index];
    const [loaded, setLoaded] = useState<{ deviceId: number } & MapPageDeviceData>();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const data = await loadDeviceData(device);
            // a reply for a device the user has already paged away from is dropped
            if (!cancelled && data) {
                setLoaded({ deviceId: device.id, ...data });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [device, loadDeviceData]);

    const step = (delta: number) => onIndexChange((index + delta + devices.length) % devices.length);

    return (
        <>
            {loaded?.deviceId === device.id
                ? <MapPagePopupContent
                    device={device}
                    deviceState={loaded.deviceState}
                    dataschema={loaded.dataschema}
                    emergencyState={emergencyStates?.find(s => s.deviceId === device.id)} />
                : <MapPagePopupSkeleton device={device} />}
            {devices.length > 1
                ? <div className={'map-popup-device-switcher'}>
                    <Button stylingMode={'text'} hint={'Предыдущее устройство'} onClick={() => step(-1)} render={() => <PreviousIcon size={18} />} />
                    <span>{index + 1} / {devices.length}</span>
                    <Button stylingMode={'text'} hint={'Следующее устройство'} onClick={() => step(1)} render={() => <NextIcon size={18} />} />
                </div>
                : null}
        </>
    );
};
