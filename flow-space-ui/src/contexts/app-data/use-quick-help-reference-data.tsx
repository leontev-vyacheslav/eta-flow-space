import { useCallback } from 'react';
import { HttpConstants } from '../../constants/app-http-constants';
import routes from '../../constants/app-api-routes';
import  { type Method, HttpStatusCode } from 'axios';
import { useAuthHttpRequest } from './use-auth-http-request';
import type { QuickHelpReferenceModel } from '../../models/quick-help-reference-model';

export type GetQuickHelpReferenceAsyncFunc = (referenceKey: string) => Promise<QuickHelpReferenceModel | null>;

export type AppDataContextQuickHelpReferenceEndpointsModel = {
    getQuickHelpReferenceAsync: GetQuickHelpReferenceAsyncFunc;
}

export const useQuickHelpReferenceData = () => {
    const authHttpRequest = useAuthHttpRequest();

    const getQuickHelpReferenceAsync = useCallback<GetQuickHelpReferenceAsyncFunc>(async (referenceKey: string) => {
        const response = await authHttpRequest({
            url: `${routes.host}${routes.quickHelpReference}/${btoa(referenceKey)}`,
            method: HttpConstants.Methods.Get as Method,
        });

        if (response && response.status === HttpStatusCode.Ok) {
            const quickHelpReference = response.data as QuickHelpReferenceModel;
            if (quickHelpReference.content) {
                quickHelpReference.content = quickHelpReference.content.replaceAll('localhost:', `${window.location.hostname}:`);
            }
            return quickHelpReference;
        }

        return null;
    }, [authHttpRequest]);

    return {
        getQuickHelpReferenceAsync
    }
}

