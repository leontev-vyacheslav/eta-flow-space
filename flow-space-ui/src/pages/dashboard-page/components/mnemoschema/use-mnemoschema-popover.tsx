import { useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useDashboardPage } from "../../dashboard-page-context"
import dxPopover from "devextreme/ui/popover";
import { useAuth } from "../../../../contexts/auth";
import { GraphIcon } from "../../../../constants/app-icons";
import { graphService } from "../../../../services/graph-service";
import { useParams } from "react-router";
import type { SchemaTypeInfoPropertiesChainModel } from "../../../../helpers/data-helper";

import './mnemoschema-popover.scss';

export const useMnemoschemaPopover = () => {
    const { isAdmin } = useAuth();
    const { deviceId } = useParams();
    const { schemaTypeInfoPropertiesChain, dataschema, device } = useDashboardPage();
    const popoverInstance = useRef<dxPopover<any>>(null);
    const escapeHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null); // Track the handler
    const popoverContentReactRootRef = useRef<ReturnType<typeof createRoot> | null>(null); // Store the root
    const popoverContainerRef = useRef<HTMLDivElement | null>(null); // Store the container

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

    useEffect(() => {
        return () => {
            queueMicrotask(() => {
                if (popoverInstance.current) {
                    popoverInstance.current.dispose();
                    popoverInstance.current = null;
                }
                if (popoverContentReactRootRef.current) {
                    popoverContentReactRootRef.current.unmount();
                    popoverContentReactRootRef.current = null;
                }
                if (popoverContainerRef.current) {
                    popoverContainerRef.current.remove();
                    popoverContainerRef.current = null;
                }
            })
        };
    }, []);

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
        popoverContainerRef.current = popoverContainer; // Store it

        const popoverContentContainer = document.createElement('div');
        const popoverContentReactRoot = createRoot(popoverContentContainer);
        popoverContentReactRootRef.current = popoverContentReactRoot; // Store it

        // Create escape key handler
        escapeHandlerRef.current = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && popoverInstance.current) {
                popoverInstance.current.hide();
            }
        };
        popoverInstance.current = new dxPopover(popoverContainer, {
            minWidth: 200,
            shading: false,
            hideOnOutsideClick: true,
            onShown: () => {
                // Add escape key listener when popover is shown
                if (escapeHandlerRef.current) {
                    document.addEventListener('keydown', escapeHandlerRef.current);
                }
            },
            onHidden: () => {
                // Remove escape key listener when popover is hidden
                if (escapeHandlerRef.current) {
                    document.removeEventListener('keydown', escapeHandlerRef.current);
                    escapeHandlerRef.current = null;
                }

                queueMicrotask(() => {
                    if (popoverContentReactRootRef.current) {
                        popoverContentReactRootRef.current.unmount();
                        popoverContentReactRootRef.current = null;
                    }
                    popoverContentContainer.remove();
                    if (popoverContainerRef.current) {
                        popoverContainerRef.current.remove();
                        popoverContainerRef.current = null;

                    }
                });
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
                queueMicrotask(() => {
                    document.querySelector(`[data-state-graph="${propertyInfo.propertiesChainValuePair.propertiesChain}"]`)
                        ?.addEventListener('click', () => {
                            popoverInstance.current?.hide();
                            popoverInstance.current?.dispose();
                            popoverInstance.current = null;
                            queueMicrotask(() => {
                                popoverContainer.remove();
                            });
                            if (!device) {
                                return;
                            }
                            graphService.show({
                                device: device,
                                schemaTypeInfos: [propertyInfo]
                            });
                        });
                });
            }
        });

        popoverInstance.current.show();
    }, [device, popoverContentRender, schemaTypeInfoPropertiesChain]);
}