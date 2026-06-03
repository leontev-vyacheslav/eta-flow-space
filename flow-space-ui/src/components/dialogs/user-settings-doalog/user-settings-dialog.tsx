import { useEffect, useRef, useState } from "react";
import { Popup as PopupRef } from "devextreme-react/popup";
import { AppDataProvider, useAppData } from "../../../contexts/app-data/app-data";
import { AuthProvider } from "../../../contexts/auth";
import { SharedAreaProvider } from "../../../contexts/shared-area";
import AppModalPopup from "../app-modal-popup/app-modal-popup";
import { RootDialogService } from "../root-dialog-service";
import { useScreenSize } from "../../../utils/media-query";
import Form, { Item, Label } from "devextreme-react/form";
import { Button } from "devextreme-react/button";

const UserSettingsDialog = (props: any) => {
    const { isXSmall, isSmall } = useScreenSize();
    const popupRef = useRef<PopupRef>(null);
    const { getUserSettingsAsync } = useAppData();
    const [userSettings, setUserSettings] = useState<any>();

    useEffect(() => {
        (async () => {
            const userSettings = await getUserSettingsAsync();

            setUserSettings(userSettings);
            console.log(userSettings);

        })();
    }, [getUserSettingsAsync]);

    return (
        <AppModalPopup
            ref={popupRef}
            title="Настройки пользователя"
            width={isXSmall || isSmall ? '95%' : 480}
            height={isXSmall || isSmall ? '80%' : 'auto'}
            dragEnabled={!(isXSmall || isSmall)}
            hideOnOutsideClick
            {...props}
            callback={(modalCallbackProps) => {
                if (props.callback) {
                    modalCallbackProps.modalResult = 'CANCEL';
                    props.callback(modalCallbackProps);
                }
            }}
        >
            <Form
                formData={userSettings}
                onFieldDataChanged={(e) => {
                    const formData = { [e.dataField as keyof any]: e.value };

                    return formData;
                }}
            >
                <Item
                    dataField="notifications.web.allow"
                    editorType="dxCheckBox"
                >
                    <Label text="Уведомления" />
                </Item>
            </Form>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '20px' }}>
                <Button
                    text="Применить"
                    type="default"
                    onClick={() => {
                        if (props.callback) {

                            popupRef.current?.instance.hide();
                        }
                    }}
                />
            </div>
        </AppModalPopup>
    );
};

class UserSettingsDialogService extends RootDialogService {
    protected readonly dialogId: string = 'user-settings-dialog-root';

    show() {
        super.show(() => {
            this.root.render(
                <AuthProvider>
                    <SharedAreaProvider>
                        <AppDataProvider>
                            <UserSettingsDialog
                                callback={() => { }}
                                onHidden={() => { this.hide(); }}
                            />
                        </AppDataProvider>
                    </SharedAreaProvider>
                </AuthProvider>
            );
        });
    }
}

export const userSettingsService = new UserSettingsDialogService();