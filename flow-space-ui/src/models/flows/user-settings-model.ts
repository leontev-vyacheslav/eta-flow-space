export class UserSettingsModel {
    notifications: {
        web: {
            enabled: boolean;
            soundType: string;
        };
    } | undefined;

    // side menu: list every object under "Карта объектов" (missing means false: only "Все объекты")
    isShowedAllMapObject?: boolean;

    // side menu: list every device; false lists only the main device of each flow (the one the diagram belongs to),
    // not its meters (missing means true)
    isShowedAllDevices?: boolean;
}
