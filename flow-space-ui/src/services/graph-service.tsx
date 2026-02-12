import { createRoot, type Root, } from 'react-dom/client';
import { AppDataProvider } from '../contexts/app-data/app-data';
import { AuthProvider } from '../contexts/auth';
import { SharedAreaProvider } from '../contexts/shared-area';
import { GraphDialog } from '../components/dialogs/graph-dialog/graph-dialog';

class GraphService {
    private popupContainer?: HTMLDivElement;
    private root?: Root;

    public show(propertiesChains: string[]) {
        document.querySelector('#graph-dialog-root')?.remove();

        this.popupContainer = document.createElement('div');
        this.popupContainer.setAttribute('id', 'graph-dialog-root');
        document.body.appendChild(this.popupContainer);

        this.root = createRoot(this.popupContainer);

        this.root.render(
            <AuthProvider>
                <SharedAreaProvider>
                    <AppDataProvider>
                        <GraphDialog
                            propertiesChains={propertiesChains}
                            callback={() => { }}
                            onHidden={() => { this.hide(); }}
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
        document.querySelector('#graph-dialog-root')?.remove();
    }
}

export const graphService = new GraphService();