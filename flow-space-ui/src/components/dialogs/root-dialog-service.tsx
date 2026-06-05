import { createRoot, type Root } from "react-dom/client";

export class RootDialogService {
    protected popupContainer?: HTMLDivElement;
    protected root: Root | null = null;
    protected readonly dialogId: string = '';

    protected show(dialogRender: any) {
        if (document.getElementById(this.dialogId)) {
            return
        };

        document.querySelector(`#${this.dialogId}`)?.remove();

        this.popupContainer = document.createElement('div');
        this.popupContainer.setAttribute('id', this.dialogId);
        document.body.appendChild(this.popupContainer);

        this.root = createRoot(this.popupContainer);
        if (dialogRender) {
            dialogRender()
        }
    }

    // public hide() {
    //     if (this.root) {
    //         this.root!.unmount();
    //     }
    //     if (this.popupContainer) {
    //         this.popupContainer.remove();
    //     }
    //     document.querySelector(`#${this.dialogId}`)?.remove();
    // }

    public hide() {
        this.root?.unmount();
        this.root = null;
        this.popupContainer?.remove();
        this.popupContainer = undefined;
    }
}