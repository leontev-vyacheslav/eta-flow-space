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
            config.headers.Authorization = `Bearer ${userAuthData.accessToken}`;

            try {
                if (!suppressLoader) {
                    showLoader();
                }

                response = await httpClientBase.request(config) as AxiosResponse;
            } catch (error) {
                const axiosError = error as AxiosError;
                response = axiosError.response;

                if (response?.status === HttpConstants.StatusCodes.Unauthorized) {
                    const refreshResult = await refreshAccessToken();
                    if (refreshResult.status === 'refreshed') {
                        config.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
                        try {
                            response = await httpClientBase.request(config) as AxiosResponse;
                        } catch (retryError) {
                            response = (retryError as AxiosError).response;
                            // only a repeated 401 means the session is gone; other errors keep the user signed in
                            if (response?.status === HttpConstants.StatusCodes.Unauthorized) {
                                await signOut();
                                if (!suppressShowUnauthorized) {
                                    proclaim({
                                        type: 'error',
                                        message: response?.data?.message || 'Сессия истекла',
                                    });
                                }
                            } else if (!suppressShowError) {
                                await proclaimError(retryError);
                            }
                            return response;
                        }
                    } else if (refreshResult.status === 'unavailable') {
                        // the refresh could not be done right now (network, rate limit, server error):
                        // keep the session, the next request tries the refresh again
                        if (!suppressShowError) {
                            await proclaimError(refreshResult.error);
                        }
                        return response;
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
