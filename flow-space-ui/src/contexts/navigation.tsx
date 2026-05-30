
import type { NavigationContextModel, NavigationDataModel } from '../models/navigation-context';
import type { AppBaseProviderProps } from '../models/app-base-provider-props';
import { createContext, useContext, useState, useEffect, type ElementType } from 'react';
import { useLocation } from 'react-router';
import { useSharedArea } from './shared-area';
import { useAppSettings } from './app-settings';

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
        const { flows } = useAppSettings();

        useEffect(() => {
            let locationPath = location.pathname;

            if (locationPath === '/') {
                locationPath = localStorage.getItem('lastNavigationPath') || locationPath;
            }

            if (locationPath === '/') {
                if (flows) {

                    const flow = flows.find(() => true)
                    if (flow) {

                        const device = flow.devices.find(() => true);
                        if (device) {
                            locationPath = `/${flow.code}/device/${device.id}`;
                        }
                    }
                }
            }

            let counter = 0;
            const interval = setInterval(() => {
                const navigationItem = document.querySelector(`li[data-item-id="${locationPath}"]`);
                if (navigationItem && treeViewRef && treeViewRef.current) {
                    const isSelected = treeViewRef.current?.instance.selectItem(navigationItem);
                    if (isSelected || counter > 10) {
                        clearInterval(interval);
                    }
                }
                counter++;
            }, 100);

            return () => clearInterval(interval);

        }, [flows, location, treeViewRef]);

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
