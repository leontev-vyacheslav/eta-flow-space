import { createRoot, type Root, } from 'react-dom/client';
import { AppDataProvider } from '../contexts/app-data/app-data';
import { AuthProvider } from '../contexts/auth';
import { SharedAreaProvider } from '../contexts/shared-area';
import { EmergencyLogDialog } from '../components/dialogs/emergency-log-dialog/emergency-log-dialog';

class EmergencyLogService {
    private popupContainer?: HTMLDivElement;
    private root?: Root;

    public show({ deviceId }: {deviceId?: number}) {
        document.querySelector('#emergency-log-dialog-root')?.remove();

        this.popupContainer = document.createElement('div');
        this.popupContainer.setAttribute('id', 'emergency-log-dialog-root');
        document.body.appendChild(this.popupContainer);

        this.root = createRoot(this.popupContainer);

        this.root.render(
            <AuthProvider>
                <SharedAreaProvider>
                    <AppDataProvider>
                        <EmergencyLogDialog
                            deviceId={deviceId}
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
        document.querySelector('#emergency-log-dialog-root')?.remove();
    }
}

export const emergencyLogService = new EmergencyLogService();