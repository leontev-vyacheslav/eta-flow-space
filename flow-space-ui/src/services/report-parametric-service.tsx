import { createRoot, type Root } from "react-dom/client";
import { AuthProvider } from "../contexts/auth";
import { AppDataProvider } from "../contexts/app-data/app-data";
import { ReportParametricDialog } from "../components/dialogs/report-parametric-dialog/report-parametric-dialog";
import { SharedAreaProvider } from "../contexts/shared-area";
import type { PopupCallbackModel } from "../models/popup-callback";

class ReportParametricService {
    private popupContainer?: HTMLDivElement;
    private root?: Root;

    public show(reportCode: string, initialParams: any, callback: (modalResult: PopupCallbackModel) => void) {
        document.querySelector('#report-params-dialog-root')?.remove();

        this.popupContainer = document.createElement('div');
        this.popupContainer.setAttribute('id', 'report-params-dialog-root');
        document.body.appendChild(this.popupContainer);

        this.root = createRoot(this.popupContainer);

        this.root?.render(
            <AuthProvider>
                <SharedAreaProvider>
                <AppDataProvider>
                    <ReportParametricDialog reportCode={reportCode} initialParams={initialParams} callback={callback} onHidden={ () => { this.hide(); } }/>
                </AppDataProvider>
                </SharedAreaProvider>
            </AuthProvider>
        );
    }
    public hide() {
        if (this.root) {
            this.root!.unmount();
        }
        if (this.popupContainer) {
            this.popupContainer.remove();
        }
    }
}

export const reportParametricService = new ReportParametricService();