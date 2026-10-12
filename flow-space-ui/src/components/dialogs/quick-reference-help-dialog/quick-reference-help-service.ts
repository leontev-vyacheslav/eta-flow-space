// Opens the help dialog. The dialog and its markdown renderer (about 320 kB) are loaded on its first use,
// not with the application.
export const quickHelpReferenceService = {
    show: async (props: { referenceKey: string }) => {
        const { quickHelpReferenceService: dialogService } = await import('./quick-reference-help-dialog');
        dialogService.show(props);
    },
};
