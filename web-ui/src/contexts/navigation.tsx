
import type { NavigationContextModel, NavigationDataModel } from '../models/navigation-context';
import type { AppBaseProviderProps } from '../models/app-base-provider-props';
import  { createContext, useContext, useState, useEffect, type ElementType } from 'react';

const NavigationContext = createContext<NavigationContextModel>({} as NavigationContextModel);
const useNavigation = () => useContext(NavigationContext);

function NavigationProvider (props: AppBaseProviderProps) {
    const [navigationData, setNavigationData] = useState<NavigationDataModel>({} as NavigationDataModel);

    return (
        <NavigationContext.Provider
            value={ { navigationData, setNavigationData } }
            { ...props }
        />
    );
}

function withNavigationWatcher(Component: ElementType, path: string) {
    const WrappedComponent = function(props: Record<string, unknown>) {
      const { setNavigationData } = useNavigation();

      useEffect(
        () => {
          setNavigationData?.({ currentPath: path });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [path, setNavigationData]
      );

      return <Component { ...props } />;
    };
    return <WrappedComponent />;
  }

export {
    NavigationProvider,
    useNavigation,
    withNavigationWatcher
}
