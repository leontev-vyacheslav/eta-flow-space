import { IoTimeSharp as TimeChartSingIcon } from "react-icons/io5";
import { VscGraphLine as GraphIcon } from "react-icons/vsc";
import type { SchemaTypeInfoPropertiesChainModel } from "../../../helpers/data-helper";


export const GraphChartTooltip = ({ info, schemaTypeInfos }: { info: any; schemaTypeInfos: SchemaTypeInfoPropertiesChainModel[]; }) => {

    return (
        <div style={{ display: "flex", flexDirection: "column", padding: 8, gap: 8 }}>
            <div style={{ display: "flex", alignItems: 'center', gap: 8 }}>
                <TimeChartSingIcon size={18} />
                <div>Время:</div>
                <div>{(info.point.data.createdAt as Date).toLocaleString('ru-RU')}</div>
            </div>
            {schemaTypeInfos.map(t => {
                return (
                    <div style={{ display: "flex", alignItems: 'center', gap: 8 }}>
                        <GraphIcon size={18} />
                        <div>{t.typeInfo?.ui.editor.label.text}{":"}</div>
                        <div>{info.point.data[t.propertiesChainValuePair.propertiesChain].toLocaleString(undefined, { minimumFractionDigits: 1 })} {t.typeInfo?.unit ? `${t.typeInfo?.unit}` : ''}</div>
                    </div>
                );
            })}
        </div>
    );
};
