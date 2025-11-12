import { useCallback } from 'react';
import { useAuthHttpRequest } from './use-auth-http-request';
import type { Method } from 'axios';
import { HttpConstants } from '../../constants/app-http-constants';
import routes from '../../constants/app-api-routes';
import type { AccountsModel, ExtendedAccountModel } from '../../models/accounts-model';


export type AppDataContextAccountsEndpointsModel = {
    getAccountsAsync: () => Promise<AccountsModel | null>;
    putAccountAsync: (account: ExtendedAccountModel, accessToken?:  string) => Promise<any>;
}

export const useAccountsData = () => {
    const authHttpRequest = useAuthHttpRequest();

    const getAccountsAsync = useCallback( async () => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.accounts}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            return response.data as AccountsModel;
        }

        return null;
    }, [authHttpRequest]);

    const putAccountAsync = useCallback(async (account: ExtendedAccountModel, accessToken?: string) => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.accounts}`,
            method: HttpConstants.Methods.Put as Method,
            headers: accessToken ? { 'X-Access-Token': accessToken }: undefined,
            data: account
        }, true);

        if (response && response.status === HttpConstants.StatusCodes.Ok) {

            return response.data;
        }

        return null;
    }, [authHttpRequest]);

    return {
        getAccountsAsync,
        putAccountAsync
    }
};