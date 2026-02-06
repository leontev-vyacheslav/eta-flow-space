import Ajv from 'ajv/dist/2020';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DeviceModel } from '../../models/flows/device-model';
import type { DeviceStateModel } from '../../models/flows/device-state-model';
import { useAppData } from '../../contexts/app-data/app-data';
import { useParams } from 'react-router';
import { proclaim } from '../../utils/proclaim';
import { getQuickGuid } from '../../utils/uuid';
import { getKeyValuePairs, getSchemaTypeInfo, type SchemaTypeInfoPropertiesChainModel } from '../../helpers/data-helper';
import type { DictionaryBaseModel } from '../../models/abstractions/dictionary-base-model';
import { jsonInfoViewService } from '../../services/json-info-view-service';

import './dashboard-page-content.scss';
import { useAuth } from '../../contexts/auth';

export type DashboardPageContextModel = {
    device?: DeviceModel;
    deviceState?: DeviceStateModel;
    mnemoschema?: string;
    dataschema?: any;
    isValidDeviceState: boolean;
    updateSharedStateRefreshToken: string;
    setUpdateSharedStateRefreshToken: React.Dispatch<React.SetStateAction<string>>;

    schemaTypeInfoPropertiesChain: SchemaTypeInfoPropertiesChainModel[] | undefined;
    registryEnums: Record<string, DictionaryBaseModel[]>;
};

const DashboardPageContext = createContext({} as DashboardPageContextModel);

function DashboardPageContextProvider(props: any) {
    const { getDeviceAsync, getDeviceStateAsync, getMnemoschemaAsync, getDeviceStateDataschemaAsync } = useAppData();
    const { deviceId, flowCode } = useParams();
    const { isAdmin } = useAuth();

    const [device, setDevice] = useState<DeviceModel | undefined>();
    const [deviceState, setDeviceState] = useState<DeviceStateModel | undefined>();
    const [mnemoschema, setMnemoschema] = useState<string | undefined>();
    const [dataschema, setDataschema] = useState<any | undefined>();
    const [isValidDeviceState, setIsValidDeviceState] = useState<boolean>(false);
    const [updateSharedStateRefreshToken, setUpdateSharedStateRefreshToken] = useState<string>(getQuickGuid());
    const [registryEnums, setRegistryEnums] = useState<Record<string, DictionaryBaseModel[]>>({});

    const schemaTypeInfoPropertiesChain = useMemo(() => {
        if (deviceState && dataschema) {
            return getKeyValuePairs(deviceState.state)
                .map(p => {
                    const typeInfo = getSchemaTypeInfo(p.propertiesChain, dataschema);
                    return { typeInfo: typeInfo, propertiesChainValuePair: p };
                })
                .filter(({ typeInfo }) => !!typeInfo && !!typeInfo.ui)
        }
    }, [dataschema, deviceState]);

    const applyDimensionsToState = useCallback((state: any, schema: any): any => {
        if (state && schema) {
            getKeyValuePairs(state).forEach(p => {
                if (typeof p.value === 'number' && Number.isFinite(p.value)) {
                    const typeInfo = getSchemaTypeInfo(p.propertiesChain, schema);
                    if (typeInfo && typeInfo.isEnum !== true && typeInfo.dimension) {
                        eval(`state.${p.propertiesChain} = ${p.value * typeInfo.dimension}`);
                    }
                }
            });
        }
    }, []);

    useEffect(() => {
        (async () => {

            if (deviceId) {
                const results = await Promise.allSettled([
                    getDeviceAsync(parseInt(deviceId)),
                    getDeviceStateAsync(parseInt(deviceId)),
                    getMnemoschemaAsync(parseInt(deviceId)),
                    getDeviceStateDataschemaAsync(parseInt(deviceId)),
                ])
                const [device, deviceState, mnemoschema, dataschema] = results.map(r => {
                    return r.status === 'fulfilled' ? r.value : null
                });
                if (deviceState && dataschema) {
                    applyDimensionsToState(deviceState.state, dataschema);
                }
                setTimeout(() => {
                    setDevice(device);
                    setDeviceState(deviceState);
                    setMnemoschema(mnemoschema);
                    setDataschema(dataschema);
                }, 200);
            }
        })();
    }, [deviceId, flowCode, getDeviceAsync, getDeviceStateAsync, getDeviceStateDataschemaAsync, getMnemoschemaAsync, applyDimensionsToState, updateSharedStateRefreshToken]);

    useEffect(() => {
        if (!dataschema) {
            return;
        }

        const ajv = new Ajv({
            strict: false,
            verbose: true,
            allErrors: true
        });

        let validateFn;
        try {
            validateFn = ajv.compile(dataschema);
        } catch (error) {
            console.error(error);

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
                const uid = getQuickGuid();
                proclaim({
                    type: 'warning',
                    contentTemplate: () => {
                        const div = document.createElement("div");
                        div.className = "dx-toast-message"
                        div.style.flexDirection = 'column';
                        div.innerHTML = `
                            <div>Не было получено валидное состояние устройства <i>${device?.name}</i>.</div>
                            ${isAdmin() ? `<a data-link='${uid}' href='javascript:void(0)'>Ошибки валидации</a>` : ''}
                        `;
                        return div;
                    },
                    onContentReady: () => {
                        if (!isAdmin()) {
                            return;
                        }
                        document.querySelector(`[data-link="${uid}"]`)?.addEventListener('click', () => {
                            jsonInfoViewService.hide();
                            const jsonInfoViewDialogRoot = document.querySelector('#json-info-view-dialog-root');

                            if (!jsonInfoViewDialogRoot && validateFn.errors) {
                                jsonInfoViewService.show('Ошибки валидации',
                                    validateFn.errors.map(({ data, message, params, ...rest }) => ({
                                        data,
                                        message,
                                        params,
                                        ...rest
                                    }))
                                );
                            }
                        })
                    },
                });
            }
            return isValid;
        });
    }, [dataschema, device, deviceState, isAdmin]);


    useEffect(() => {
        const timer = setInterval(async () => {
            if (!deviceId) {
                return;
            }
            const deviceState = await getDeviceStateAsync(parseInt(deviceId));
            if (deviceState && dataschema) {
                applyDimensionsToState(deviceState.state, dataschema);
                setDeviceState(deviceState);
            }
        }, 60000);

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        }
    }, [dataschema, deviceId, getDeviceStateAsync, applyDimensionsToState]);

    useEffect(() => {
        if (dataschema && dataschema.$defs) {
            const registryEnums = {} as Record<string, DictionaryBaseModel[]>;
            Object
                .keys(dataschema.$defs)
                .filter(k => {
                    return dataschema.$defs[k].enum && Array.isArray(dataschema.$defs[k].enum)
                })
                .forEach(k => {
                    registryEnums[k] = Object.entries(dataschema.$defs[k].enumDescriptions)
                        .map(([id, description]) => ({
                            id: Number(id),
                            description: (description as string).split(' - ').pop() || description as string
                        }))
                });

            setRegistryEnums(registryEnums);


        }
    }, [dataschema]);

    return (
        <DashboardPageContext.Provider value={{
            device,
            deviceState,
            mnemoschema,
            dataschema,
            isValidDeviceState,
            updateSharedStateRefreshToken,
            setUpdateSharedStateRefreshToken,

            schemaTypeInfoPropertiesChain,
            registryEnums
        }} {...props} />
    );
}

const useDashboardPage = () => useContext(DashboardPageContext);

export { DashboardPageContextProvider, useDashboardPage };
