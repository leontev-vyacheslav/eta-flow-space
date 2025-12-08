import Ajv from 'ajv';
import { createContext, useContext, useEffect, useState } from 'react';
import type { DeviceModel } from '../../models/flows/device-model';
import type { DeviceStateModel } from '../../models/flows/device-state-model';
import { useAppData } from '../../contexts/app-data/app-data';
import { useParams } from 'react-router';
import { proclaim } from '../../utils/proclaim';

import './dashboard-page-content.scss';

export type DashboardPageContextModel = {
    device?: DeviceModel;
    deviceState?: DeviceStateModel;
    mnemoschema?: string;
    dataschema?: any;
    isValidDeviceState: boolean;
};

const DashboardPageContext = createContext({} as DashboardPageContextModel);

function DashboardPageContextProvider(props: any) {
    const { getDeviceAsync, getDeviceStateAsync, getMnemoschemaAsync, getDeviceStateDataschemaAsync } = useAppData();
    const { deviceId, flowCode } = useParams();

    const [device, setDevice] = useState<DeviceModel | undefined>();
    const [deviceState, setDeviceState] = useState<DeviceStateModel | undefined>();
    const [mnemoschema, setMnemoschema] = useState<string | undefined>();
    const [dataschema, setDataschema] = useState<any | undefined>();
    const [isValidDeviceState, setIsValidDeviceState] = useState<boolean>(false);

    useEffect(() => {
        (async () => {

            if (deviceId) {
                const [device, deviceState, mnemoschema, dataschema] = await Promise.all([
                    getDeviceAsync(parseInt(deviceId)),
                    getDeviceStateAsync(parseInt(deviceId)),
                    getMnemoschemaAsync(parseInt(deviceId)),
                    getDeviceStateDataschemaAsync(parseInt(deviceId)),
                ])
                if (device) {
                    setDevice(device);
                }
                if (deviceState) {
                    setDeviceState(deviceState);
                }
                if (mnemoschema) {
                    setMnemoschema(mnemoschema);
                }
                if (dataschema) {
                    setDataschema(dataschema);
                }
            }
        })();
    }, [deviceId, flowCode, getDeviceAsync, getDeviceStateAsync, getDeviceStateDataschemaAsync, getMnemoschemaAsync]);

    useEffect(() => {
        if (!dataschema) {
            return;
        }

        const ajv = new Ajv({
            strict: false,
        });

        let validateFn;
        try {
            validateFn = ajv.compile(dataschema);
        } catch {
            validateFn = null;
        }

        if (!deviceState) {
            return;
        }

        if (!validateFn) {
            proclaim({
                type: 'warning',
                message: `Схема описания состояние устройства ${device?.name} не валидна.`,
            });
        }

        const isValid = validateFn ? validateFn(deviceState.state) : false;
        setIsValidDeviceState(() => {
            if (!isValid && validateFn) {
                proclaim({
                    type: 'warning',
                    message: `Не было получено валидное состояние устройства ${device?.name}.`,
                });
            }
            return isValid;
        });
    }, [dataschema, device, deviceState]);

    useEffect(() => {
        const timer = setInterval(async () => {
            if (!deviceId) {
                return;
            }

            const deviceState = await getDeviceStateAsync(parseInt(deviceId));
            if (deviceState) {
                setDeviceState(deviceState);
            }
        }, 60000);

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        }
    }, [deviceId, getDeviceStateAsync]);

    return (
        <DashboardPageContext.Provider value={{
            device,
            deviceState,
            mnemoschema,
            dataschema,
            isValidDeviceState
        }} {...props} />
    );
}

const useDashboardPage = () => useContext(DashboardPageContext);

export { DashboardPageContextProvider, useDashboardPage };
