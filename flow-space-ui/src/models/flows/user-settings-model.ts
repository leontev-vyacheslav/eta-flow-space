export class UserSettingsModel {
    notifications: {
        web: {
            enabled: boolean;
            soundType: string;
        };
    } | undefined;

    // side menu: list every object under "Карта объектов" (missing, as in settings saved before, means true)
    isShowedAllMapObject?: boolean;
}
