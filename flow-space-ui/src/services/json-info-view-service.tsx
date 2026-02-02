import { createRoot, type Root, } from 'react-dom/client';
import { AppDataProvider } from '../contexts/app-data/app-data';
import { AuthProvider } from '../contexts/auth';
import { SharedAreaProvider } from '../contexts/shared-area';
import { JsonInfoViewDialog } from '../components/dialogs/json-info-view-dialog/json-info-view-dialog';

class JsonInfoViewService {
    private popupContainer?: HTMLDivElement;
    private root?: Root;

    public show(title: string, content: object) {
        document.querySelector('#json-info-view-dialog-root')?.remove();

        this.popupContainer = document.createElement('div');
        this.popupContainer.setAttribute('id', 'json-info-view-dialog-root');
        document.body.appendChild(this.popupContainer);

        this.root = createRoot(this.popupContainer);

        this.root.render(
            <AuthProvider>
                <SharedAreaProvider>
                    <AppDataProvider>
                        <JsonInfoViewDialog
                            title={title}
                            content={ content }
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
        document.querySelector('#json-info-view-dialog-root')?.remove();
    }
}

export const jsonInfoViewService = new JsonInfoViewService();