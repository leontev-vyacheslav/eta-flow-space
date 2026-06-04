import type { Dispatch, SetStateAction } from 'react';
import type { FlowModel } from './flows/flow-model';
import type { UserSettingsModel } from './flows/user-settings-model';

export type AppSettingsModel = {
    workDate?: Date;

    isShowFooter: boolean;

    userSettings?: UserSettingsModel;
}

export type AppSettingsDataContextModel = AppSettingsModel;

export type AppSettingsContextModel = {
    appSettingsData: AppSettingsDataContextModel;
    setAppSettingsData: Dispatch<SetStateAction<AppSettingsDataContextModel>>;

    flows?: FlowModel[];
}
