
import type { NavigationContextModel, NavigationDataModel } from '../models/navigation-context';
import type { AppBaseProviderProps } from '../models/app-base-provider-props';
import { createContext, useContext, useState, useEffect, type ElementType } from 'react';
import { useLocation } from 'react-router';
import { useSharedArea } from './shared-area';

const NavigationContext = createContext<NavigationContextModel>({} as NavigationContextModel);
const useNavigation = () => useContext(NavigationContext);


function NavigationProvider(props: AppBaseProviderProps) {
    const [navigationData, setNavigationData] = useState<NavigationDataModel>({} as NavigationDataModel);

    return (
        <NavigationContext.Provider
            value={{ navigationData, setNavigationData }}
            {...props}
        />
    );
}

function withNavigationWatcher(Component: ElementType, path: string) {
    const WrappedComponent = function (props: Record<string, unknown>) {
        const { setNavigationData } = useNavigation();

        const location = useLocation();
        const { treeViewRef } = useSharedArea();

        useEffect(() => {
            const navigationItem = document.querySelector(`li[data-item-id="${location.pathname}"]`);
            if (navigationItem) {
                treeViewRef.current?.instance.selectItem(navigationItem);
            }

        }, [location, treeViewRef]);

        useEffect(
            () => {
                setNavigationData?.({ currentPath: path });
            },
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [path, setNavigationData]
        );

        return <Component {...props} />;
    };
    return <WrappedComponent />;
}

export {
    NavigationProvider,
    useNavigation,
    withNavigationWatcher
}
