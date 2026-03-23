import { SelectBox } from "devextreme-react";
import { CloseIcon } from "../../../constants/app-icons";
import type { SchemaTypeInfoPropertiesChainModel } from "../../../helpers/data-helper";
import type { MenuItemModel } from "../../../models/menu-item-model";
import { MainMenu } from "../../menu/main-menu/main-menu";
import { Popup as PopupRef } from "devextreme-react/popup";
import { useGraphDialog } from "./graph-dialog-context";
import type { DeviceModel } from "../../../models/flows/device-model";

import './graph-dialog-title.scss'

export const GraphDialogTitle = ({ device, popupRef, menuItems, schemaTypeInfos }: { device?: DeviceModel, popupRef: React.RefObject<PopupRef | null>, menuItems: MenuItemModel[], schemaTypeInfos: SchemaTypeInfoPropertiesChainModel[] }) => {
    const { currentSchemaTypeInfoIndex, setCurrentSchemaTypeInfoIndex } = useGraphDialog();
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 8px'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <span style={{ fontSize: '20px', fontWeight: 500 }}>График</span>
                <div style={{ fontSize: 12, color: 'rgb(118, 118, 118)' }}>{device?.name}</div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
                {schemaTypeInfos.length > 1 ?
                    <SelectBox
                        displayExpr={'label'}
                        valueExpr={'value'}
                        dataSource={schemaTypeInfos.map(c => ({ label: `${c.typeInfo?.ui.editor.label.text} ${c.propertiesChainValuePair.arrayIndex !== undefined ? `${c.propertiesChainValuePair.arrayIndex + 1}` : ''}`, value: c }))}
                        value={schemaTypeInfos[currentSchemaTypeInfoIndex]}
                        onValueChanged={(e) => setCurrentSchemaTypeInfoIndex(schemaTypeInfos.indexOf(e.value))}
                        dropDownOptions={{
                            width: 300
                        }}
                    />
                    : null}
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