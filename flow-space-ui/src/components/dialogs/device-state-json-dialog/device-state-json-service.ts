import type { DeviceStateJsonDialogParams } from './device-state-json-dialog';

// Opens the device state JSON dialog. The dialog is loaded on its first use, not with the application.
export const deviceStateJsonService = {
    show: async (params: DeviceStateJsonDialogParams) => {
        const { deviceStateJsonService: dialogService } = await import('./device-state-json-dialog');
        dialogService.show(params);
    },
};
