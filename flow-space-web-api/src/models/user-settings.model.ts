export class UserSettingsModel {
    notifications: {
        web: {
            enabled: boolean;
            soundType: string;
        };
    };

    // UI side menu: list every object under "Карта объектов" (missing means true)
    isShowedAllMapObject?: boolean;
}
