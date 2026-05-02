import { useCallback, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useDashboardPage } from "../../dashboard-page-context"
import dxPopover from "devextreme/ui/popover";
import { useAuth } from "../../../../contexts/auth";
import { GraphIcon, HelpIcon, TypeIcon, VariableIcon } from "../../../../constants/app-icons";
import { graphService } from "../../../../services/graph-service";
import type { SchemaTypeInfoPropertiesChainModel } from "../../../../helpers/data-helper";
import { showAlertDialog } from "../../../../utils/dialogs";
import AppConstants from "../../../../constants/app-constants";

import './mnemoschema-popover.scss';

export const useMnemoschemaPopover = () => {
    const { isAdmin } = useAuth();
    const { schemaTypeInfoPropertiesChain, dataschema, device } = useDashboardPage();
    const popoverInstance = useRef<dxPopover<any>>(null);
    const escapeHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null); // Track the handler
    const popoverContentReactRootRef = useRef<ReturnType<typeof createRoot> | null>(null); // Store the root
    const popoverContainerRef = useRef<HTMLDivElement | null>(null); // Store the container
    const popoverTitleContainerRef = useRef<HTMLDivElement>(null);
    const popoverTitleReactRootRef = useRef<ReturnType<typeof createRoot> | null>(null);

    const showEnumReference = useCallback((propertyInfo: SchemaTypeInfoPropertiesChainModel) => {
        showAlertDialog({
            title: 'Информация',
            textRender: () => {
                return (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }} >
                            <div style={{ fontSize: 12, fontWeight: 500 }}>{propertyInfo.typeInfo!.ui.editor.label.text}</div>
                            <div style={{ fontSize: 10, color: 'rgb(118, 118, 118)' }}>{propertyInfo.propertiesChainValuePair.propertiesChain}</div>
                        </div>
                        <table className='simple-grid' style={{ margin: 0, width: '100%', minWidth: '350px' }}>
                            <tbody>
                                {
                                    Object.entries(dataschema.$defs[propertyInfo.typeInfo!.typeName].enumDescriptions).map(
                                        ([key, value]) =>
                                            <tr key={key} >
                                                <td style={{ width: 30 }}>{key}</td>
                                                <td> {(value as any).split(' - ').shift()}</td>
                                                <td> {(value as any).split(' - ').pop()}</td>
                                            </tr>
                                    )
                                }
                            </tbody>
                        </table>
                    </>
                )
            },
            callback: async () => { }
        });
    }, [dataschema]);

    const PropertyInfoTable = useCallback(({ propertyInfos, values }: { propertyInfos: SchemaTypeInfoPropertiesChainModel[], values: any[] }) => {
        return (
            <table className='simple-grid'>
                <thead>
                    <tr><th colSpan={2}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                            <VariableIcon size={16} />
                            {propertyInfos.length > 1 ? 'Свойства' : 'Свойство'}
                        </div>
                    </th></tr>
                </thead>
                <tbody>
                    {propertyInfos.map((propertyInfo) => {
                        const value = values.find((v) => v.propertiesChain === propertyInfo.propertiesChainValuePair.propertiesChain)?.value;
                        return (
                            <tr>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                        <span style={{ fontSize: '1em' }}>{propertyInfo.typeInfo?.ui.editor.label.text ?? ''}</span>
                                        {isAdmin() ?
                                            <>
                                                <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85em', color: 'gray', gap: 5 }} >
                                                    <VariableIcon size={12} />
                                                    {propertyInfo.propertiesChainValuePair.propertiesChain}
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85em', color: 'gray', gap: 5 }}>
                                                    <TypeIcon size={12} />
                                                    {propertyInfo.typeInfo?.typeName}
                                                </span>
                                            </>
                                            : null}
                                    </div>
                                </td>
                                <td >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <b style={{ width: '100%' }}>{value}</b>
                                        {propertyInfo.typeInfo?.ui.chart ? <GraphIcon data-state-graph={propertyInfo.propertiesChainValuePair.propertiesChain} alignmentBaseline="middle" size={16} style={{ cursor: 'pointer' }} /> : null}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }, [isAdmin]);


    const popoverContentRender = useCallback((propertyInfos: SchemaTypeInfoPropertiesChainModel[], target: Element) => {
        const values: { propertiesChain: string, value: any }[] = [];

        for (const propertyInfo of propertyInfos) {
            let value = propertyInfo.propertiesChainValuePair.value;
            if (propertyInfo.typeInfo?.typeName === 'boolean') {
                value = value === true ? 'Да' : 'Нет';
            }
            if (propertyInfo.typeInfo?.typeName === 'number') {
                if (propertyInfo.typeInfo?.formatting && propertyInfo.typeInfo?.formatting.options) {
                    value = new Intl.NumberFormat(
                        propertyInfo.typeInfo.formatting.locale ?? AppConstants.formatting.numberFormat.locale,
                        propertyInfo.typeInfo.formatting.options
                    ).format(value);
                } else {
                    value = new Intl.NumberFormat(
                        AppConstants.formatting.numberFormat.locale,
                        AppConstants.formatting.numberFormat.options as any
                    ).format(value);
                }
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
                    value = (
                        <div style={{ display: 'flex', gap: 5 }}>
                            <span>{value}</span>
                            <HelpIcon style={{ cursor: 'pointer' }} size={14} onClick={() => {
                                popoverInstance.current!.hide();
                                showEnumReference(propertyInfo);
                            }} />
                        </div>
                    );
                } else {
                    value = enumDescription ? enumDescription : <span style={{ color: 'red' }}>Ошибка ({value})</span>
                }
            } else {
                const unit = propertyInfo.typeInfo?.unit;
                value = `${value}${unit ? ' ' + unit : ''}`;
            }
            values.push({ propertiesChain: propertyInfo.propertiesChainValuePair.propertiesChain, value });
        }

        return (
            <PropertyInfoTable propertyInfos={propertyInfos} values={values} />
        );
    }, [PropertyInfoTable, dataschema, isAdmin, showEnumReference]);

    useEffect(() => {
        return () => {
            queueMicrotask(() => {
                popoverInstance.current?.dispose();
                popoverInstance.current = null;

                popoverContentReactRootRef.current?.unmount();
                popoverContentReactRootRef.current = null;
                popoverContainerRef.current?.remove();
                popoverContainerRef.current = null;

                popoverTitleReactRootRef.current?.unmount();
                popoverTitleReactRootRef.current = null;
                popoverTitleContainerRef.current?.remove();
                popoverTitleContainerRef.current = null;
            })
        };
    }, []);

    const PopoverTitle = () => {
        return (
            <a className="popup-close-button" onClick={() => popoverInstance.current?.hide()}>
                <span aria-hidden="true">×</span>
            </a>
        );
    }

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
        const propertyNames = dataStateAttr.split(';');

        const propertyInfos = schemaTypeInfoPropertiesChain?.filter(({ propertiesChainValuePair }) => propertyNames.includes(propertiesChainValuePair.propertiesChain));

        if (!propertyInfos || propertyInfos.length === 0) {
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

        const popoverTitleContainer = document.createElement('div');
        popoverTitleContainerRef.current = popoverTitleContainer;

        const popoverTitleReactRoot = createRoot(popoverTitleContainer);
        popoverTitleReactRootRef.current = popoverTitleReactRoot;

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
            showTitle: true,
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
                popoverContentReactRoot.render(popoverContentRender(propertyInfos, target));
                return popoverContentContainer;
            },
            titleTemplate: () => {
                popoverTitleReactRoot.render(
                    <PopoverTitle />
                )
                return popoverTitleContainer;
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
                for (const propertyInfo of propertyInfos) {
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
            }
        });

        popoverInstance.current.show();
    }, [device, popoverContentRender, schemaTypeInfoPropertiesChain]);
}