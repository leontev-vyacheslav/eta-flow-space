import { useCallback, useEffect, useState } from "react";
import type { Method } from "axios";
import { HttpConstants } from "../../../constants/app-http-constants";
import routes from "../../../constants/app-api-routes";
import { useAuthHttpRequest } from "../use-auth-http-request";
import type { FlowModel } from "../../../models/flows/flow-model";
import type { DeviceModel } from "../../../models/flows/device-model";
import type {
  DeviceStateModel,
  DeviceStatePropertiesModel,
} from "../../../models/flows/device-state-model";
import type { EmergencyStateModel } from "../../../models/flows/emergency-state-model";
import type { EmergencyModel } from "../../../models/flows/emergency-model";
import type { UserSettingsModel } from "../../../models/flows/user-settings-model";

export type GetFlowListAsyncFunc = () => Promise<FlowModel[] | undefined>;
export type GetDeviceListAsyncFunc = () => Promise<DeviceModel[] | undefined>;
export type GetDeviceStatesAsyncFunc = (
  deviceId: number,
) => Promise<Record<string, DeviceStateModel> | undefined>;
export type GetEmergencyStateAsyncFunc = () => Promise<
  EmergencyModel[] | undefined
>;
export type GetMnemoschemaAsyncFunc = (
  flowCode: string,
) => Promise<string | undefined>;
export type GetDeviceAsyncFunc = (
  deviceId: number,
) => Promise<DeviceModel | undefined>;
export type GetDeviceStateDataschemaAsyncFunc = (
  flowCode: string,
) => Promise<any | undefined>;
export type GetDeviceStatesByDatesAsyncFunc = (
  deviceId: number,
  beginDate: Date,
  endDate: Date,
  fields: string[],
) => Promise<DeviceStatePropertiesModel[] | undefined>;
export type GetEmergencyStatesByDatesAsyncFunc = (
  deviceId: number | undefined,
  beginDate: Date,
  endDate: Date,
) => Promise<EmergencyStateModel[] | undefined>;
export type GetMnemoschemaStylesheetsAsyncFunc = (
  flowCode: string,
) => Promise<string | null | undefined>;

export type AppDataContextFlowEndpointsModel = {
  getStaticFilesManifest: () => Promise<any>;
  getFlowListAsync: GetFlowListAsyncFunc;
  getDeviceListAsync: GetDeviceListAsyncFunc;
  getDeviceStatesAsync: GetDeviceStatesAsyncFunc;
  getMnemoschemaAsync: GetMnemoschemaAsyncFunc;
  getDeviceAsync: GetDeviceAsyncFunc;
  getDeviceByCodeAsync: (deviceCode: string) => Promise<DeviceModel | undefined>;
  getDeviceStateDataschemaAsync: GetDeviceStateDataschemaAsyncFunc;
  getDeviceStatesByDatesAsync: GetDeviceStatesByDatesAsyncFunc;
  getEmergencyStatesAsync: GetEmergencyStateAsyncFunc;
  getEmergencyStatesByDatesAsync: GetEmergencyStatesByDatesAsyncFunc;
  getReportAsync: (url: string, params: any) => Promise<Blob | undefined>;
  getReportDefinitionAsync: (reportId: number) => Promise<any | undefined>;
  getMnemoschemaStylesheetsAsync: GetMnemoschemaStylesheetsAsyncFunc;
  getUserSettingsAsync: () => Promise<UserSettingsModel | undefined>;
  postUserSettingsAsync: (userSettings: UserSettingsModel) => Promise<void>;
  staticFilesManifest: any;
};

export const useFlowData = () => {
  const [staticFilesManifest, setStaticFilesManifest] = useState<any>();
  const authHttpRequest = useAuthHttpRequest();

  const getStaticFilesManifest = useCallback(async () => {
    const res = await fetch(
      `${routes.host}/static/manifest.json?v=${Date.now()}`,
    );
    return res.ok ? res.json() : {};
  }, []);

  const getFlowListAsync = useCallback<GetFlowListAsyncFunc>(async () => {
    const response = await authHttpRequest({
      url: `${routes.host}${routes.flows}`,
      method: HttpConstants.Methods.Get as Method,
    });

    if (response && response.status === HttpConstants.StatusCodes.Ok) {
      return response.data as FlowModel[];
    }
  }, [authHttpRequest]);

  const getDeviceListAsync = useCallback<GetDeviceListAsyncFunc>(async () => {
    const response = await authHttpRequest({
      url: `${routes.host}${routes.devices}`,
      method: HttpConstants.Methods.Get as Method,
    });

    if (response && response.status === HttpConstants.StatusCodes.Ok) {
      return response.data as DeviceModel[];
    }
  }, [authHttpRequest]);

  const getDeviceStatesAsync = useCallback<GetDeviceStatesAsyncFunc>(
    async (deviceId: number) => {
      const response = await authHttpRequest(
        {
          url: `${routes.host}${routes.deviceStates}/${deviceId}`,
          method: HttpConstants.Methods.Get as Method,
        },
        true,
      );

      if (response && response.status === HttpConstants.StatusCodes.Ok) {
        return response.data as Record<string, DeviceStateModel>;
      }
    },
    [authHttpRequest],
  );

  const getMnemoschemaAsync = useCallback<GetMnemoschemaAsyncFunc>(
    async (deviceCode: string) => {
      return await fetch(
        `${routes.host}/static/devices/${deviceCode}/mnemo-schema.svg?v=${Date.now()}`,
      ).then((res) => (res.ok ? res.text() : undefined));
    },
    [],
  );

  const getDeviceStateDataschemaAsync =
    useCallback<GetDeviceStateDataschemaAsyncFunc>(
      async (deviceCode: string) => {
        return fetch(
          // `${routes.host}/static/devices/${deviceCode}/data-schema.json?v=${staticFilesManifest["data-schema"] ?? Date.now()}`,
          `${routes.host}/static/devices/${deviceCode}/data-schema.json?v=${Date.now()}`,
        ).then((res) => (res.ok ? res.json() : undefined));
      },
      [],
    );

  const getMnemoschemaStylesheetsAsync =
    useCallback<GetMnemoschemaStylesheetsAsyncFunc>(
      async (deviceCode: string) => {
        return await fetch(
          `${routes.host}/static/devices/${deviceCode}/mnemo-schema.css?v=${Date.now()}`,
        ).then((res) => (res.ok ? res.text() : undefined));
      },
      [],
    );

  const getDeviceAsync = useCallback(
    async (deviceId: number) => {
      const response = await authHttpRequest({
        url: `${routes.host}${routes.devices}/${deviceId}`,
        method: HttpConstants.Methods.Get as Method,
      });

      if (response && response.status === HttpConstants.StatusCodes.Ok) {
        return response.data as DeviceModel;
      }
    },
    [authHttpRequest],
  );

  const getDeviceByCodeAsync = useCallback(
    async (deviceCode: string) => {
      const response = await authHttpRequest({
        url: `${routes.host}${routes.devices}/by-code/${deviceCode}`,
        method: HttpConstants.Methods.Get as Method,
      });

      if (response && response.status === HttpConstants.StatusCodes.Ok) {
        return response.data as DeviceModel;
      }
    },
    [authHttpRequest],
  );

  const getDeviceStatesByDatesAsync = useCallback(
    async (
      deviceId: number,
      beginDate: Date,
      endDate: Date,
      fields: string[],
    ) => {
      const response = await authHttpRequest({
        url: `${routes.host}${routes.deviceStates}/${deviceId}/dates?beginDate=${beginDate.toISOString()}&endDate=${endDate.toISOString()}&fields=${fields.join(";")}`,
        method: HttpConstants.Methods.Get as Method,
      });

      if (response && response.status === HttpConstants.StatusCodes.Ok) {
        return response.data as DeviceStatePropertiesModel[];
      }
    },
    [authHttpRequest],
  );

  const getEmergencyStatesAsync = useCallback(async () => {
    const response = await authHttpRequest(
      {
        url: `${routes.host}${routes.emergencyStates}`,
        method: HttpConstants.Methods.Get as Method,
      },
      true,
    );

    if (response && response.status === HttpConstants.StatusCodes.Ok) {
      return response.data as EmergencyModel[];
    }
  }, [authHttpRequest]);

  const getEmergencyStatesByDatesAsync = useCallback(
    async (deviceId: number | undefined, beginDate: Date, endDate: Date) => {
      const urlDateParams = `?beginDate=${beginDate.toISOString()}&endDate=${endDate.toISOString()}`;
      const url = deviceId
        ? `${routes.host}${routes.emergencyStates}/${deviceId}/dates${urlDateParams}`
        : `${routes.host}${routes.emergencyStates}/dates${urlDateParams}`;
      const response = await authHttpRequest({
        url: url,
        method: HttpConstants.Methods.Get as Method,
      });

      if (response && response.status === HttpConstants.StatusCodes.Ok) {
        return response.data as EmergencyStateModel[];
      }
    },
    [authHttpRequest],
  );

  const getReportDefinitionAsync = useCallback(
    async (reportId: number) => {
      const response = await authHttpRequest({
        url:
          process.env.NODE_ENV !== "production"
            ? `http://localhost:8000/api/reports/${reportId}`
            : `${routes.host}${routes.reporting}/reports/${reportId}`,
        method: HttpConstants.Methods.Get as Method,
      });

      if (response && response.status === HttpConstants.StatusCodes.Ok) {
        return response.data as any;
      }
    },
    [authHttpRequest],
  );

  const getReportAsync = useCallback(
    async (url: string, params: any) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await authHttpRequest(
        {
          url:
            process.env.NODE_ENV !== "production"
              ? `http://localhost:8000/api${url}`
              : `${routes.host}${routes.reporting}${url}`,
          params: { ...params, timezone },
          method: HttpConstants.Methods.Get as Method,
          responseType: "blob",
        },
        true,
      );
      if (response && response.status === HttpConstants.StatusCodes.Ok) {
        return new Blob([response.data], { type: "application/pdf" });
      }
    },
    [authHttpRequest],
  );

  const getUserSettingsAsync = useCallback(async () => {
    const response = await authHttpRequest({
      url: `${routes.host}${routes.users}/settings`,
      method: HttpConstants.Methods.Get as Method,
    });

    if (response && response.status === HttpConstants.StatusCodes.Ok) {
      return response.data as UserSettingsModel;
    }
  }, [authHttpRequest]);

  const postUserSettingsAsync = useCallback(
    async (settings: UserSettingsModel) => {
      await authHttpRequest({
        url: `${routes.host}${routes.users}/settings`,
        method: HttpConstants.Methods.Post as Method,
        data: settings,
      });
    },
    [authHttpRequest],
  );

  useEffect(() => {
    (async () => {
      const staticFilesManifest = await getStaticFilesManifest();
      setStaticFilesManifest(staticFilesManifest);
    })();
  }, [getStaticFilesManifest]);

  return {
    getStaticFilesManifest,
    getFlowListAsync,
    getDeviceListAsync,
    getDeviceStatesAsync,
    getMnemoschemaAsync,
    getMnemoschemaStylesheetsAsync,
    getDeviceAsync,
    getDeviceByCodeAsync,
    getDeviceStateDataschemaAsync,
    getDeviceStatesByDatesAsync,
    getEmergencyStatesAsync,
    getEmergencyStatesByDatesAsync,
    getReportAsync,
    getReportDefinitionAsync,
    getUserSettingsAsync,
    postUserSettingsAsync,
    staticFilesManifest,
  };
};
