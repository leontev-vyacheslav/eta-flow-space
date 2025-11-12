import type { Dispatch, SetStateAction } from 'react';

export type AppSettingsModel = {
    workDate?: Date;

    isShowFooter: boolean;
}

export type AppSettingsDataContextModel = AppSettingsModel;

export type AppSettingsContextModel = {
    appSettingsData: AppSettingsDataContextModel;

    setAppSettingsData: Dispatch<SetStateAction<AppSettingsDataContextModel>>;

    updateWorkDateAsync: () => Promise<void>;
}
