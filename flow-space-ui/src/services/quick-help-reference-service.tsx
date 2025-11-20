import { createRoot, type Root, } from 'react-dom/client';
import { QuickReferenceHelpDialog } from '../components/dialogs/quick-reference-help-dialog/quick-reference-help-dialog';
import { AppDataProvider } from '../contexts/app-data/app-data';
import { AuthProvider } from '../contexts/auth';
import { SharedAreaProvider } from '../contexts/shared-area';

class QuickHelpReferenceService {
    private popupContainer?: HTMLDivElement;
    private root?: Root;

    public show(refenceKey: string) {
        document.querySelector('#quick-help-dialog-root')?.remove();

        this.popupContainer = document.createElement('div');
        this.popupContainer.setAttribute('id', 'quick-help-dialog-root');
        document.body.appendChild(this.popupContainer);

        this.root = createRoot(this.popupContainer);

        this.root.render(
            <AuthProvider>
                <SharedAreaProvider>
                    <AppDataProvider>
                        <QuickReferenceHelpDialog
                            referenceKey={ refenceKey }
                            callback={ () => { } }
                            onHidden={ () => { this.hide(); } }
                        />
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

export const quickHelpReferenceService = new QuickHelpReferenceService();