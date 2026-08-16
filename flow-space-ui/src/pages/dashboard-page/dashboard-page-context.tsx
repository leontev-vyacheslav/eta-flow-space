// import Ajv from 'ajv/dist/2020';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DeviceModel } from '../../models/flows/device-model';
import type { DeviceStateModel } from '../../models/flows/device-state-model';
import { useAppData } from '../../contexts/app-data/app-data';
import { useParams } from 'react-router';
import { proclaim } from '../../utils/proclaim';
import { getQuickGuid } from '../../utils/uuid';
import { getKeyValuePairs, getSchemaTypeInfo, type SchemaTypeInfoPropertiesChainModel } from '../../helpers/data-helper';
import type { DictionaryBaseModel } from '../../models/abstractions/dictionary-base-model';
// import { jsonInfoViewService } from '../../components/dialogs/json-info-view-dialog/json-info-view-dialog';
// import { selectIsAdmin } from '../../contexts/auth-selectors';
// import { useAuthStore } from '../../contexts/auth-store';

import './dashboard-page-content.scss';

export type DashboardPageContextModel = {
    device?: DeviceModel;
    deviceStates?: DeviceStateModel[];
    mnemoschema?: string;
    dataschemas?: Record<string, any>;
    isValidDeviceState: boolean;
    refreshToken: string;
    setRefreshToken: React.Dispatch<React.SetStateAction<string>>;

    schemasTypeInfoPropertiesChain: Record<string, SchemaTypeInfoPropertiesChainModel[]> | undefined;
    registryEnums: Record<string, DictionaryBaseModel[]>;
};

const DashboardPageContext = createContext({} as DashboardPageContextModel);

function DashboardPageContextProvider(props: any) {
    const { getDeviceAsync, getDeviceStatesAsync, getMnemoschemaAsync, getDeviceStateDataschemaAsync } = useAppData();
    const { deviceId, flowCode } = useParams();
    // const isAdmin = useAuthStore(selectIsAdmin);

    const [device, setDevice] = useState<DeviceModel | undefined>();
    const [deviceStates, setDeviceStates] = useState<Record<string, DeviceStateModel> | undefined>();
    const [mnemoschema, setMnemoschema] = useState<string | undefined>();
    const [dataschemas, setDataschemas] = useState<Record<string, any> | undefined>();
    // const [isValidDeviceState, setIsValidDeviceState] = useState<boolean>(false);
    const [isValidDeviceState] = useState<boolean>(false);
    const [refreshToken, setRefreshToken] = useState<string>(getQuickGuid());
    const [registryEnums, setRegistryEnums] = useState<Record<string, Record<string, DictionaryBaseModel[]>>>({});

    const schemasTypeInfoPropertiesChain = useMemo(() => {
        const schemaTypeInfoPropertiesChain: Record<string, SchemaTypeInfoPropertiesChainModel[]> = {};
        if (deviceStates && dataschemas) {
            for (const deviceCode of Object.keys(deviceStates)) {
                schemaTypeInfoPropertiesChain[deviceCode] = getKeyValuePairs(deviceStates[deviceCode].state)
                    .map(p => {
                        const typeInfo = getSchemaTypeInfo(p.propertiesChain, dataschemas[deviceCode]);
                        return { typeInfo: typeInfo, propertiesChainValuePair: p };
                    })
                    .filter(({ typeInfo }) => !!typeInfo && !!typeInfo.ui);
            }
        }

        return schemaTypeInfoPropertiesChain;
    }, [dataschemas, deviceStates]);


    const applyDimensionsToStates = useCallback((deviceStates: Record<string, DeviceStateModel> | undefined, dataschemas: Record<string, any> | undefined): any => {
        if (!deviceStates || !dataschemas) {
            return;
        }
        for (const code of Object.keys(deviceStates)) {
            const schema = dataschemas[code];
            const state = deviceStates[code].state;
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
        let cancelled = false;

        (async () => {
            if (!deviceId || !flowCode) {
                return;
            }
            const targetDeviceId = parseInt(deviceId, 10);

            const targetDevice = await getDeviceAsync(targetDeviceId);
            if (cancelled) {
                return;
            }

            if (!targetDevice) {
                proclaim({
                    type: 'error',
                    message: `Не удалось получить данные устройства с идентификатором ${deviceId}.`,
                });
                return;
            }
            const mnemoschemaSelectorDeviceCode = targetDevice.mnemoschemaSelector.sourceDeviceId == targetDevice.id
                ? targetDevice.code
                : targetDevice.mnemoschemaSelector.sourceDevice.code;

            const dataschemaEntries = await Promise.all(
                targetDevice.mnemoschemaSelector.linkedDevices.map(async (ld) => {
                    const schema = await getDeviceStateDataschemaAsync(ld.deviceCode);
                    return [ld.deviceCode, schema] as const;
                })
            );
            if (cancelled) {
                return;
            }

            const targetDataschemas = Object.fromEntries(dataschemaEntries.filter(([, s]) => s));

            const labeledFetches = [
                { label: 'состояния устройства', promise: getDeviceStatesAsync(targetDeviceId) },
                { label: 'мнемосхемы', promise: getMnemoschemaAsync(mnemoschemaSelectorDeviceCode) },
            ];
            const settledFetches = await Promise.allSettled(labeledFetches.map((f) => f.promise));
            if (cancelled) return;

            settledFetches.forEach((result, i) => {
                if (result.status === 'rejected') {
                    proclaim({ type: 'error', message: `Не удалось получить данные ${labeledFetches[i].label} с идентификатором ${deviceId}.` });
                }
            });

            const deviceStates = (settledFetches[0].status === 'fulfilled' ? settledFetches[0].value : undefined) as Record<string, DeviceStateModel> | undefined;
            const mnemoschema = (settledFetches[1].status === 'fulfilled' ? settledFetches[1].value : undefined) as string | undefined;

            applyDimensionsToStates(deviceStates, targetDataschemas);

            setDevice(targetDevice);
            setDeviceStates(deviceStates);
            setMnemoschema(mnemoschema);
            setDataschemas(targetDataschemas);
        })();

        return () => { cancelled = true; };
    }, [deviceId, flowCode, getDeviceAsync, getDeviceStatesAsync, getMnemoschemaAsync, getDeviceStateDataschemaAsync, applyDimensionsToStates, refreshToken]);

    // useEffect(() => {
    //     if (!dataschemas) {
    //         return;
    //     }

    //     const ajv = new Ajv({
    //         strict: false,
    //         verbose: true,
    //         allErrors: true
    //     });

    //     let validateFn;
    //     try {
    //         validateFn = ajv.compile(dataschemas[0]);
    //     } catch (error) {
    //         console.error(error);

    //         validateFn = null;
    //     }

    //     if (!deviceState) {
    //         return;
    //     }

    //     if (!validateFn) {
    //         proclaim({
    //             type: 'warning',
    //             message: `Схема описания состояние устройства ${device?.name} не валидна.`,
    //         });
    //     }

    //     const isValid = validateFn ? validateFn(deviceState.state) : false;
    //     setIsValidDeviceState(() => {
    //         if (!isValid && validateFn) {
    //             const uid = getQuickGuid();
    //             proclaim({
    //                 type: 'warning',
    //                 contentTemplate: () => {
    //                     const div = document.createElement("div");
    //                     div.className = "dx-toast-message"
    //                     div.style.flexDirection = 'column';
    //                     div.innerHTML = `
    //                         <div>Не было получено валидное состояние устройства <i>${device?.name}</i>.</div>
    //                         ${isAdmin ? `<a data-link='${uid}' href='javascript:void(0)'>Ошибки валидации</a>` : ''}
    //                     `;
    //                     return div;
    //                 },
    //                 onContentReady: () => {
    //                     if (!isAdmin) {
    //                         return;
    //                     }
    //                     document.querySelector(`[data-link="${uid}"]`)?.addEventListener('click', () => {
    //                         jsonInfoViewService.hide();
    //                         const jsonInfoViewDialogRoot = document.querySelector('#json-info-view-dialog-root');

    //                         if (!jsonInfoViewDialogRoot && validateFn.errors) {
    //                             jsonInfoViewService.show({
    //                                 title: 'Ошибки валидации',
    //                                 content: validateFn.errors.map(({ data, message, params, ...rest }) => ({
    //                                     data,
    //                                     message,
    //                                     params,
    //                                     ...rest
    //                                 }))
    //                             });
    //                         }
    //                     })
    //                 },
    //             });
    //         }
    //         return isValid;
    //     });
    // }, [dataschemas, device, deviceStates, isAdmin]);

    useEffect(() => {
        const timer = setInterval(async () => {
            if (!deviceId) {
                return;
            }

            const deviceStates = await getDeviceStatesAsync(parseInt(deviceId));
            applyDimensionsToStates(deviceStates, dataschemas);
            setDeviceStates(deviceStates);
        }, 60000);

        return () => {
            if (timer) {
                clearInterval(timer);
            }
        }
    }, [deviceId, getDeviceStatesAsync, applyDimensionsToStates, dataschemas]);

    useEffect(() => {
        const registriesEnums = {} as Record<string, Record<string, DictionaryBaseModel[]>>;
        if (!deviceStates || !dataschemas) {
            setRegistryEnums(registriesEnums);
            return;
        }

        for (const deviceCode of Object.keys(deviceStates)) {
            const dataschema = dataschemas?.[deviceCode];
            if (!dataschema || !dataschema.$defs) {
                continue;
            }

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

            registriesEnums[deviceCode] = registryEnums;
        }
        setRegistryEnums(registriesEnums);
    }, [dataschemas, deviceStates]);

    return (
        <DashboardPageContext.Provider value={{
            device,
            deviceStates,
            mnemoschema,
            dataschemas,
            isValidDeviceState,
            refreshToken,
            setRefreshToken,

            schemasTypeInfoPropertiesChain,
            registryEnums
        }} {...props} />
    );
}

const useDashboardPage = () => useContext(DashboardPageContext);

export { DashboardPageContextProvider, useDashboardPage };
