export class UserSettingsModel {
    notifications: {
        web: {
            enabled: boolean;
            soundType: string;
        };
    } | undefined;
}
