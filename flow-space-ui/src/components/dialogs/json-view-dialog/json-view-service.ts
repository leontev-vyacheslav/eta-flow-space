import type { JsonViewDialogParams } from './json-view-dialog';

// Opens the JSON view dialog (a device's state or data schema). The dialog is loaded on its first use, not with the application.
export const jsonViewService = {
    show: async (params: JsonViewDialogParams) => {
        const { jsonViewService: dialogService } = await import('./json-view-dialog');
        dialogService.show(params);
    },
};
