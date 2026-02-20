import { CloseIcon } from "../../../constants/app-icons";
import type { MenuItemModel } from "../../../models/menu-item-model";
import { MainMenu } from "../../menu/main-menu/main-menu";
import { Popup as PopupRef } from "devextreme-react/popup";

export const GraphDialogTitle = ({ popupRef, menuItems }: { popupRef: React.RefObject<PopupRef | null>, menuItems: MenuItemModel[] }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 8px'
        }}>
            <span style={{ fontSize: '20px', fontWeight: 500 }}>График</span>
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