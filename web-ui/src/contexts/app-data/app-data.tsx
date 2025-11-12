import { createContext, useContext } from 'react';
import type { AppBaseProviderProps } from '../../models/app-base-provider-props';
import { type AppDataContextAuthCheckEndpointsModel, useAuthData } from './use-auth-data';
import { type AppDataContextAccountsEndpointsModel, useAccountsData } from './use-accounts-data';
import { type AppDataContextQuickHelpRefernceEndpointsModel, useQuickHelpRefernceData } from './use-quick-help-reference-data';
import { type AppDataContextServicesEndpointsModel, useServicesData } from './use-services-data';

export type AppDataContextModel =
    & AppDataContextAuthCheckEndpointsModel
    & AppDataContextAccountsEndpointsModel
    & AppDataContextQuickHelpRefernceEndpointsModel
    & AppDataContextServicesEndpointsModel;

const AppDataContext = createContext<AppDataContextModel>({} as AppDataContextModel);
const useAppData = () => useContext(AppDataContext);

function AppDataProvider(props: AppBaseProviderProps) {
    const auth = useAuthData();
    const accounts = useAccountsData();
    const quickHelpRefernce = useQuickHelpRefernceData();
    const services = useServicesData();

    return (
        <AppDataContext.Provider
            value={{
                ...auth,
                ...accounts,
                ...quickHelpRefernce,
                ...services
            }}
            {...props}
        />
    );
}

export { AppDataProvider, useAppData };
