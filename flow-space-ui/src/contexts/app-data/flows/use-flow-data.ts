import { useCallback } from 'react';
import { HttpConstants } from '../../../constants/app-http-constants';
import routes from '../../../constants/app-api-routes';
import type { Method } from 'axios';
import { useAuthHttpRequest } from '../use-auth-http-request';
import type { FlowModel } from '../../../models/flows/flow-model';
import type { DeviceModel } from '../../../models/flows/device-model';
import type { DeviceStateModel, DeviceStatePropertiesModel } from '../../../models/flows/device-state-model';

export type GetFlowListAsyncFunc = () => Promise<FlowModel[] | undefined>;
export type GetDeviceListAsyncFunc = () => Promise<DeviceModel[] | undefined>;
export type GetDeviceStateAsyncFunc = (deviceId: number) => Promise<DeviceStateModel | undefined>;
export type GetMnemoschemaAsyncFunc = (deviceId: number) => Promise<string | undefined>;
export type GetDeviceAsyncFunc = (deviceId: number) => Promise<DeviceModel | undefined>;
export type GetDeviceStateDataschemaAsyncFunc = (deviceId: number) => Promise<any | undefined>;
export type GetDeviceStatesByDatesAsyncFunc = (deviceId: number, beginDate: Date, endDate: Date, fields: string[]) => Promise<DeviceStatePropertiesModel[] | undefined>;

export type AppDataContextFlowEndpointsModel = {
    getFlowListAsync: GetFlowListAsyncFunc;
    getDeviceListAsync: GetDeviceListAsyncFunc;
    getDeviceStateAsync: GetDeviceStateAsyncFunc;
    getMnemoschemaAsync: GetMnemoschemaAsyncFunc;
    getDeviceAsync: GetDeviceAsyncFunc;
    getDeviceStateDataschemaAsync: GetDeviceStateDataschemaAsyncFunc;
    getDeviceStatesByDatesAsync: GetDeviceStatesByDatesAsyncFunc
};

export const useFlowData = () => {
    const authHttpRequest = useAuthHttpRequest();

    const getFlowListAsync = useCallback<GetFlowListAsyncFunc>(async () => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.flows}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            return response.data.values as FlowModel[];
        }

    }, [authHttpRequest]);

    const getDeviceListAsync = useCallback<GetDeviceListAsyncFunc>(async () => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.devices}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            return response.data.values as DeviceModel[];
        }

    }, [authHttpRequest]);

    const getDeviceStateAsync = useCallback<GetDeviceStateAsyncFunc>(async (deviceId: number) => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.states}/${deviceId}`,
            method: HttpConstants.Methods.Get as Method,
        }, true);

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            return response.data.values as DeviceStateModel;
        }
    }, [authHttpRequest]);

    const getMnemoschemaAsync = useCallback<GetMnemoschemaAsyncFunc>(async (deviceId: number) => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.mnemoschemas}/${deviceId}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            return response.data as string;
        }
    }, [authHttpRequest]);

    const getDeviceAsync = useCallback(async (deviceId: number) => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.devices}/${deviceId}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            return response.data.values as DeviceModel;
        }
    }, [authHttpRequest]);

    const getDeviceStateDataschemaAsync = useCallback(async (deviceId: number) => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.dataschema}/${deviceId}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            return response.data as any;
        }
    }, [authHttpRequest]);

    const getDeviceStatesByDatesAsync = useCallback(async (deviceId: number, beginDate: Date, endDate: Date, fields: string[]) => {
         const response = await authHttpRequest({
            url: `${routes.host}${routes.states}/${deviceId}/dates?beginDate=${beginDate}&endDate=${endDate}&fields=${fields.join(';')}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            return response.data.values as DeviceStatePropertiesModel[];
        }
    }, [authHttpRequest]);

    return {
        getFlowListAsync,
        getDeviceListAsync,
        getDeviceStateAsync,
        getMnemoschemaAsync,
        getDeviceAsync,
        getDeviceStateDataschemaAsync,
        getDeviceStatesByDatesAsync
    };
}

