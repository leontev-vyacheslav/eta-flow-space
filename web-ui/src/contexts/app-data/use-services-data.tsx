import { useCallback } from 'react';
import { HttpConstants } from '../../constants/app-http-constants';
import routes from '../../constants/app-api-routes';
import type { Method } from 'axios';
import { useAuthHttpRequest } from './use-auth-http-request';
import type { MessageModel } from '../../models/message-model';

export type GetSystemRebootRequestAsyncFunc = () => Promise<MessageModel | null>;
export type GetAliveRequestAsyncFunc = () => Promise<MessageModel | null>;

export type AppDataContextServicesEndpointsModel = {
    getSystemRebootRequestAsync: GetSystemRebootRequestAsyncFunc;
    getAliveRequestAsync: GetAliveRequestAsyncFunc;
}

export const useServicesData = () => {
    const authHttpRequest = useAuthHttpRequest();

    const getSystemRebootRequestAsync = useCallback<GetSystemRebootRequestAsyncFunc>(async () => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.services}/reboot`,
            method: HttpConstants.Methods.Get as Method,
    }, true);

        if (response && response.status === HttpConstants.StatusCodes.Accepted) {
            const message = response.data as MessageModel;

            return message;
        }

        return null;
    }, [authHttpRequest]);

    const getAliveRequestAsync = useCallback<GetAliveRequestAsyncFunc>(async () => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.services}/alive`,
            method: HttpConstants.Methods.Get as Method,
            timeout: 1000,

        }, true, true, true);

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            const message = response.data as MessageModel;

            return message;
        }

        return null;
    }, [authHttpRequest]);

    return {
        getSystemRebootRequestAsync, getAliveRequestAsync
    }
}

