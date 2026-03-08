import { SelectBox } from "devextreme-react";
import { CloseIcon } from "../../../constants/app-icons";
import type { SchemaTypeInfoPropertiesChainModel } from "../../../helpers/data-helper";
import type { MenuItemModel } from "../../../models/menu-item-model";
import { MainMenu } from "../../menu/main-menu/main-menu";
import { Popup as PopupRef } from "devextreme-react/popup";
import { useGraphDialog } from "./graph-dialog-context";

export const GraphDialogTitle = ({ popupRef, menuItems, schemaTypeInfos }: { popupRef: React.RefObject<PopupRef | null>, menuItems: MenuItemModel[], schemaTypeInfos: SchemaTypeInfoPropertiesChainModel[] }) => {
    const { currentSchemaTypeInfoIndex, setCurrentSchemaTypeInfoIndex } = useGraphDialog();

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '0 8px'
        }}>
            <span style={{ fontSize: '20px', fontWeight: 500 }}>График</span>
            <div style={{ display: 'flex', gap: 5 }}>
                {schemaTypeInfos.length > 1 ?
                    <SelectBox displayExpr={'label'} valueExpr={'value'} dataSource={schemaTypeInfos.map(c => ({ label: c.typeInfo?.ui.editor.label.text, value: c }))}
                        value={schemaTypeInfos[currentSchemaTypeInfoIndex]}
                        onValueChanged={(e) => setCurrentSchemaTypeInfoIndex(schemaTypeInfos.indexOf(e.value))}
                        dropDownOptions={ {
                            width: 350
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