import { useCallback } from 'react';
import { HttpConstants } from '../../constants/app-http-constants';
import routes from '../../constants/app-api-routes';
import type { Method } from 'axios';
import { useAuthHttpRequest } from './use-auth-http-request';
import type { QuickHelpReferenceModel } from '../../models/quick-help-reference-model';

export type GetQuickHelpRefernceAsyncFunc = (referenceKey: string) => Promise<QuickHelpReferenceModel | null>;

export type AppDataContextQuickHelpRefernceEndpointsModel = {
    getQuickHelpRefernceAsync: GetQuickHelpRefernceAsyncFunc;
}

export const useQuickHelpRefernceData = () => {
    const authHttpRequest = useAuthHttpRequest();

    const getQuickHelpRefernceAsync = useCallback<GetQuickHelpRefernceAsyncFunc>(async (referenceKey: string) => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.quickHelpReference}/${btoa(referenceKey)}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpConstants.StatusCodes.Ok) {
            const quickHelpReference = response.data as QuickHelpReferenceModel;
            if (quickHelpReference.content) {
                quickHelpReference.content = quickHelpReference.content.replaceAll('localhost:', `${window.location.hostname}:`);
            }
            return quickHelpReference;
        }

        return null;
    }, [authHttpRequest]);

    return {
        getQuickHelpRefernceAsync
    }
}

