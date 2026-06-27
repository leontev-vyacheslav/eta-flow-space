import { useCallback } from 'react';
import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { HttpConstants } from '../../constants/app-http-constants';
import { useSharedArea } from '../shared-area';
import type { SharedAreaContextModel } from '../../models/shared-area-context';
import { httpClientBase } from './http-client-base';
import { proclaim, proclaimError } from '../../utils/proclaim';
import { useAuthStore } from '../auth-store';

export type AxiosWithCredentialsFunc = (
    config: AxiosRequestConfig,
    suppressLoader?: boolean,
    suppressShowUnauthorized?: boolean,
    suppressShowError?: boolean
) => Promise<AxiosResponse | undefined>;

export const useAuthHttpRequest = () => {
    const getUserAuthDataFromStorage = useAuthStore((s) => s.getUserAuthDataFromStorage);
    const signOut = useAuthStore((s) => s.signOut);
    const refreshAccessToken = useAuthStore((s) => s.refreshAccessToken);
    const { showLoader, hideLoader }: SharedAreaContextModel = useSharedArea();

    const axiosWithCredentials = useCallback<AxiosWithCredentialsFunc>(

        async (config: AxiosRequestConfig, suppressLoader: boolean = false, suppressShowUnauthorized: boolean = false, suppressShowError: boolean = false) => {
            let response: AxiosResponse<any, any> | null | AxiosResponse<unknown, any> | undefined;
            const userAuthData = getUserAuthDataFromStorage();
            if (!userAuthData) {
                await signOut();
                return undefined;
            }
            config = config || {};
            config.headers = config.headers || {};
            config.headers = { ...config.headers, ...HttpConstants.Headers.AcceptJson };
            config.timeoutErrorMessage = 'Сервер не ответил в установленный период времени 10 сек.'
            if (userAuthData) {
                config.headers.Authorization = `Bearer ${userAuthData.accessToken}`;
                config.headers['X-Requested-User'] = userAuthData.login
            }

            try {
                if (!suppressLoader) {
                    showLoader();
                }

                response = await httpClientBase.request(config) as AxiosResponse;
            } catch (error) {
                const axiosError = error as AxiosError;
                response = axiosError.response;

                if (response?.status === HttpConstants.StatusCodes.Unauthorized) {
                    const newAccessToken = await refreshAccessToken();
                    if (newAccessToken) {
                        config.headers.Authorization = `Bearer ${newAccessToken}`;
                        try {
                            response = await httpClientBase.request(config) as AxiosResponse;
                        } catch (retryError) {
                            response = (retryError as AxiosError).response;
                            await signOut();
                            if (!suppressShowUnauthorized) {
                                proclaim({
                                    type: 'error',
                                    message: response?.data?.message || 'Сессия истекла',
                                });
                            }
                            return response;
                        }
                    } else {
                        await signOut();
                        if (!suppressShowUnauthorized) {
                            proclaim({
                                type: 'error',
                                message: response?.data?.message || 'Сессия истекла',
                            });
                        }
                        return response;
                    }
                } else {
                    if (!suppressShowError) {
                        await proclaimError(error);
                    }
                }
            } finally {
                if (!suppressLoader) {
                    setTimeout(() => {
                        hideLoader();
                    }, 100);
                }
            }

            return response;
        },
        [getUserAuthDataFromStorage, hideLoader, showLoader, signOut, refreshAccessToken],
    );

    return axiosWithCredentials
}
