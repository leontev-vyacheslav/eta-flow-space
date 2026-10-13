import { useRef, useState } from "react";
import { Popup as PopupRef } from "devextreme-react/popup";
import { AppDataProvider, useAppData } from "../../../contexts/app-data/app-data";
import { SharedAreaProvider } from "../../../contexts/shared-area";
import AppModalPopup from "../app-modal-popup/app-modal-popup";
import { RootDialogService } from "../root-dialog-service";
import { useScreenSize } from "../../../utils/media-query";
import { Form, Item, Label, Tab, TabbedItem } from "devextreme-react/form";
import { Button } from "devextreme-react/button";
import { useAppSettingsStore } from "../../../contexts/app-settings-store";
import { selectIsAdmin } from "../../../contexts/auth-selectors";
import { useAuthStore } from "../../../contexts/auth-store";

import './user-settings-dialog.scss';

const UserSettingsDialog = (props: any) => {
    const { isXSmall, isSmall } = useScreenSize();
    const isAdmin = useAuthStore(selectIsAdmin);
    const popupRef = useRef<PopupRef>(null);
    const { appSettingsData, setAppSettingsData } = useAppSettingsStore();
    const { postUserSettingsAsync } = useAppData();
    // the form edits a copy: closing the dialog without "Применить" leaves the settings as they were
    const [formData] = useState(() => appSettingsData.userSettings
        ? {
            ...structuredClone(appSettingsData.userSettings),
            // off unless the user turned it on
            isShowedAllMapObject: appSettingsData.userSettings.isShowedAllMapObject ?? false,
            isShowedAllDevices: appSettingsData.userSettings.isShowedAllDevices ?? true,
        }
        : undefined);

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
            <Form formData={formData} elementAttr={{ class: 'user-settings-form' }}>
                <TabbedItem tabPanelOptions={{ deferRendering: false }}>
                    <Tab title="Вид">
                        <Item
                            dataField="isShowedAllDevices"
                            editorType="dxCheckBox"
                        >
                            <Label text="Показывать все устройства" />
                        </Item>
                        <Item
                            dataField="isShowedAllMapObject"
                            editorType="dxCheckBox"
                        >
                            <Label text="Показывать все объекты карты" />
                        </Item>
                    </Tab>
                    <Tab title="Уведомления">
                        <Item
                            dataField="notifications.web.enabled"
                            editorType="dxCheckBox"
                            editorOptions={{
                                disabled: !isAdmin
                            }}
                        >
                            <Label text="Уведомления в браузере" />
                        </Item>
                        <Item
                            dataField="notifications.web.soundType"
                            editorType="dxSelectBox"
                            editorOptions={{
                                valueExpr: "value",
                                displayExpr: "text",
                                items: [
                                    { value: 'buzzer', text: 'Бипер' },
                                    { value: 'siren', text: 'Cирена' }
                                ]
                            }}
                        >
                            <Label text="Тип звука" />
                        </Item>
                    </Tab>
                </TabbedItem>
            </Form>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '30px' }}>
                <Button
                    text="Применить"
                    type="default"
                    onClick={async () => {
                        if (formData) {
                            await postUserSettingsAsync(formData);
                            setAppSettingsData({ userSettings: { ...formData } });
                        }
                        popupRef.current?.instance.hide();
                        props.callback?.();
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
            this.root!.render(
                <SharedAreaProvider>
                    <AppDataProvider>
                        <UserSettingsDialog
                            callback={() => { }}
                            onHidden={() => { this.hide(); }}
                        />
                    </AppDataProvider>
                </SharedAreaProvider>
            );
        });
    }
}

export const userSettingsService = new UserSettingsDialogService();