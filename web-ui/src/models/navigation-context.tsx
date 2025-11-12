import type { Dispatch, SetStateAction } from 'react';

export type  NavigationDataModel = {
  currentPath: string;
}

export type NavigationContextModel = {
  navigationData: NavigationDataModel;

  setNavigationData:  Dispatch<SetStateAction<NavigationDataModel>>;
};
