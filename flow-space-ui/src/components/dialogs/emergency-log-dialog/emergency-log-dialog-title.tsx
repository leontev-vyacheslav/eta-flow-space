import { CloseIcon } from "../../../constants/app-icons";
import type { DeviceModel } from "../../../models/flows/device-model";
import type { MenuItemModel } from "../../../models/menu-item-model";
import { MainMenu } from "../../menu/main-menu/main-menu";
import { Popup as PopupRef } from "devextreme-react/popup";

export const EmergencyLogDialogTitle = ({ device, popupRef, menuItems }: { device?: DeviceModel, popupRef: React.RefObject<PopupRef | null>, menuItems: MenuItemModel[] }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 8px'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '20px', fontWeight: 500 }}>Журнал аварий</span>
                <span style={{ fontSize: '12px', color: 'rgb(118, 118, 118)'}}>{device ? device.name :  'Все устройства'}</span>
            </div>
            <div style={{ display: 'flex' }}>
                <MainMenu items={menuItems} />
                <MainMenu items={[{
                    icon: () => (<CloseIcon size={20} color='black' />),
                    onClick: () => {
                        popupRef.current?.instance.hide();
                    }
                }]} />
            </div>
        </div>
    );
};