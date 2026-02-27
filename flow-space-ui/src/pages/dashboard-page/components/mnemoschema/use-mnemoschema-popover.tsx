import { useCallback, useRef } from "react";
import { useDashboardPage } from "../../dashboard-page-context"
import dxPopover from "devextreme/ui/popover";
import { useAuth } from "../../../../contexts/auth";
import { GraphIcon } from "../../../../constants/app-icons";

import './mnemoschema-popover.scss';
import { graphService } from "../../../../services/graph-service";
import { useParams } from "react-router";
import type { SchemaTypeInfoPropertiesChainModel } from "../../../../helpers/data-helper";
import { createRoot } from "react-dom/client";

export const useMnemoschemaPopover = () => {
    const { isAdmin } = useAuth();
    const { deviceId } = useParams();
    const { schemaTypeInfoPropertiesChain, dataschema } = useDashboardPage();
    const popoverInstance = useRef<dxPopover<any>>(null);

    const popoverContentRender = useCallback((propertyInfo: SchemaTypeInfoPropertiesChainModel, target: Element) => {
        let value = propertyInfo.propertiesChainValuePair.value;
        if (propertyInfo.typeInfo?.typeName === 'boolean') {
            value = value === true ? 'Да' : 'Нет';
        }
        if (propertyInfo.typeInfo?.ui.editor.editorOptions.type === 'datetime') {
            const date = new Date(value);
            const formatAttr = target.getAttribute('data-state-format');
            if (formatAttr === 'date') {
                value = date.toLocaleDateString('ru-RU');
            } else if (formatAttr === 'time') {
                value = date.toLocaleTimeString('ru-RU');
            } else {
                value = date.toLocaleString('ru-RU');
            }
        } else if (propertyInfo.typeInfo?.isEnum) {
            const enumDescription = dataschema.$defs[propertyInfo.typeInfo?.typeName].enumDescriptions[value]?.split(' - ').pop();
            if (isAdmin()) {
                value = enumDescription ? enumDescription + ' (' + value + ')' : <span style={{ color: 'red' }}>Ошибка ({value})</span>
            } else {
                value = enumDescription ? enumDescription : <span style={{ color: 'red' }}>Ошибка ({value})</span>
            }
        } else {
            const unit = propertyInfo.typeInfo?.unit;
            value = `${value}${unit ? ' ' + unit : ''}`;
        }

        return (
            <table className='simple-grid'>
                <thead>
                    <tr><th colSpan={2}>{propertyInfo.typeInfo?.ui.editor.label.text ?? ''}</th></tr>
                </thead>
                <tbody>
                    {isAdmin() ?
                        <>
                            <tr>
                                <td>Свойство:</td>
                                <td>{propertyInfo.propertiesChainValuePair.propertiesChain}</td>
                            </tr>
                            <tr>
                                <td>Тип:</td>
                                <td>{propertyInfo.typeInfo?.typeName}</td>
                            </tr>
                        </>
                        : null
                    }
                    <tr>
                        <td>Значение:</td>
                        <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <b>{value}</b>
                                {propertyInfo.typeInfo?.ui.chart ? <GraphIcon data-state-graph={propertyInfo.propertiesChainValuePair.propertiesChain} alignmentBaseline="middle" size={16} style={{ cursor: 'pointer' }} /> : null}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        );
    }, [dataschema, isAdmin]);

    return useCallback((event: MouseEvent) => {
        const target = (event.target as Element)?.closest?.("[data-state]");
        if (!target) {
            return;
        }
        const dataStateAttr = target.getAttribute("data-state");

        if (!dataStateAttr) {
            return;
        }

        if (popoverInstance.current) {
            popoverInstance.current.dispose();
        }

        const propertyInfo = schemaTypeInfoPropertiesChain?.find(({ propertiesChainValuePair }) => (propertiesChainValuePair.propertiesChain === dataStateAttr));

        if (!propertyInfo) {
            return;
        }

        document.querySelectorAll("[data-mnemoschema-popover]").forEach(element => {
            try {
                element.remove();
            } catch (error) {
                console.error(error);
            }
        });

        const popoverContainer = document.createElement('div');
        popoverContainer.setAttribute('data-mnemoschema-popover', '');
        document.body.appendChild(popoverContainer);

        const popoverContentContainer = document.createElement('div');
        const popoverContentReactRoot = createRoot(popoverContentContainer);

        popoverInstance.current = new dxPopover(popoverContainer, {
            minWidth: 200,
            shading: false,
            hideOnOutsideClick: true,
            onHidden: () => {
                popoverContentReactRoot.unmount();
                popoverContentContainer.remove();
                setTimeout(() => {
                    popoverContainer.remove();
                }, 0);
            },
            contentTemplate: () => {
                popoverContentReactRoot.render(popoverContentRender(propertyInfo, target));
                return popoverContentContainer;
            },
            wrapperAttr: {
                class: 'mnemoschema-popover'
            },
            position: {
                at: "top left",
                my: "top left",
                of: window,
                offset: {
                    x: event.clientX,
                    y: event.clientY
                },
                collision: 'flipfit'
            },
            onContentReady: () => {
                if (!propertyInfo.typeInfo?.ui.chart) {
                    return;
                }
                const t = setTimeout(() => {
                    document.querySelector(`[data-state-graph="${propertyInfo.propertiesChainValuePair.propertiesChain}"]`)
                        ?.addEventListener('click', () => {
                            popoverInstance.current?.hide();
                            popoverInstance.current?.dispose();
                            setTimeout(() => {
                                popoverContainer.remove();
                            }, 0);
                            if (!deviceId) {
                                return;
                            }
                            graphService.show({
                                deviceId: parseInt(deviceId),
                                schemaTypeInfos: [propertyInfo]
                            });
                            clearTimeout(t);
                        });
                }, 0);
            }
        });

        popoverInstance.current.show();
    }, [deviceId, popoverContentRender, schemaTypeInfoPropertiesChain]);
}