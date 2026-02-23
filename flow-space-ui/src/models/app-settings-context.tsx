import type { Dispatch, SetStateAction } from 'react';
import type { FlowModel } from './flows/flow-model';

export type AppSettingsModel = {
    workDate?: Date;

    isShowFooter: boolean;
}

export type AppSettingsDataContextModel = AppSettingsModel;

export type AppSettingsContextModel = {
    appSettingsData: AppSettingsDataContextModel;
    setAppSettingsData: Dispatch<SetStateAction<AppSettingsDataContextModel>>;
    
    flows?: FlowModel[];
}
