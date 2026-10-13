export class UserSettingsModel {
    notifications: {
        web: {
            enabled: boolean;
            soundType: string;
        };
    } | undefined;

    // side menu: list every object under "Карта объектов" (missing means false: only "Все объекты")
    isShowedAllMapObject?: boolean;
}
