export class UserSettingsModel {
    notifications: {
        web: {
            enabled: boolean;
            soundType: string;
        };
    };

    // UI side menu: list every object under "Карта объектов" (missing means false)
    isShowedAllMapObject?: boolean;

    // UI side menu: list every device; false lists only the main device of each flow, not its meters (missing means true)
    isShowedAllDevices?: boolean;
}
