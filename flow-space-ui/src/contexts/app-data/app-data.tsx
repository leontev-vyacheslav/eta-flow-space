import { createContext, useContext } from 'react';
import type { AppBaseProviderProps } from '../../models/app-base-provider-props';
import { type AppDataContextHealthCheckEndpointsModel, useAuthData } from './use-health-data';
import { type AppDataContextQuickHelpReferenceEndpointsModel, useQuickHelpReferenceData } from './use-quick-help-reference-data';
import { useFlowData, type AppDataContextFlowEndpointsModel } from './flows/use-flow-data';

export type AppDataContextModel =
    & AppDataContextHealthCheckEndpointsModel
    & AppDataContextQuickHelpReferenceEndpointsModel
    & AppDataContextFlowEndpointsModel;

const AppDataContext = createContext<AppDataContextModel>({} as AppDataContextModel);
const useAppData = () => useContext(AppDataContext);

function AppDataProvider(props: AppBaseProviderProps) {
    const auth = useAuthData();
    const quickHelpReference = useQuickHelpReferenceData();
    const flow = useFlowData();

    return (
        <AppDataContext.Provider
            value={{
                ...auth,
                ...quickHelpReference,
                ...flow
            }}
            {...props}
        />
    );
}

export { AppDataProvider, useAppData };
