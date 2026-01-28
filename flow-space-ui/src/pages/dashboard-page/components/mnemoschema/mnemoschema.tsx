import { useCallback, useEffect, useRef, useState } from "react";
import { useLongPress } from "use-long-press";
import { useDashboardPage } from "../../dashboard-page-context";
import { useScreenSize } from "../../../../utils/media-query";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useParams } from "react-router";
import dxPopover from "devextreme/ui/popover";


export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const { flowCode } = useParams();
    const { mnemoschema, isValidDeviceState, dataschema, schemaTypeInfoPropertiesChain } = useDashboardPage();
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const containerRef = useRef<HTMLDivElement>(null);
    const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
    const [isInitComplete, setIsInitComplete] = useState<boolean>(false);
    const popoverInstance = useRef<dxPopover<any>>(null);

    const stateSetup = useCallback((mnemoschemaElement: HTMLElement) => {
        if (!schemaTypeInfoPropertiesChain) {
            return;
        }

        schemaTypeInfoPropertiesChain
            .forEach(({ typeInfo, propertiesChainValuePair }) => {
                mnemoschemaElement.querySelectorAll(`[data-state="${propertiesChainValuePair.propertiesChain}"]`)
                    .forEach(element => {
                        let value = propertiesChainValuePair.value;

                        if (element.tagName === 'text') {
                            if (typeInfo?.isEnum) {
                                try {
                                    const enumDescription = (dataschema.$defs[typeInfo.typeName].enumDescriptions[value].split(' - ').pop() as string).split('(')[0].trim();
                                    element.innerHTML = enumDescription === 'Не используется' ? '' : enumDescription;
                                } catch {
                                    element.innerHTML = '<tspan style="fill: red">Ошибка</tspan>'
                                }
                            } else {
                                const unit = typeInfo && typeInfo.unit;
                                if (unit) {
                                    element.innerHTML = `${value} ${unit ? unit : ''}`;
                                } else {
                                    const formatAttr = element.getAttribute('data-state-format');

                                    if (typeInfo?.ui.editor.editorOptions.type === 'datetime') {
                                        const date = new Date(value);
                                        if (formatAttr === 'date') {
                                            value = date.toLocaleDateString('ru-RU');
                                        } else if (formatAttr === 'time') {
                                            value = date.toLocaleTimeString('ru-RU');
                                        } else {
                                            value = date.toLocaleString('ru-RU');
                                        }
                                    }
                                    element.innerHTML = value;
                                }
                                if (typeInfo?.label) {
                                    element.innerHTML = `${typeInfo?.label}: ${element.innerHTML}`;
                                }
                            }
                        } else if (typeInfo?.ui.colorizer) {
                            const styleProps = typeInfo?.ui.colorizer.styleProps;
                            if (styleProps) {
                                // "styleProps": [ ... ]
                                styleProps.forEach((styleProp: any) => {
                                    Object.keys(styleProp).forEach(stylePropKey => {
                                        //  "fill": {...}
                                        const stylePropObj = styleProp[stylePropKey];
                                        Object.keys(stylePropObj).forEach(k => {
                                            // "red": true
                                            if (stylePropObj[k] === value || (Array.isArray(stylePropObj[k]) && stylePropObj[k].includes(value))) {
                                                const hint = element.getAttribute('data-colorizer-hint');
                                                if (hint) {
                                                    if (hint === stylePropKey) {
                                                        ((element as SVGElement).style as any)[stylePropKey] = k;
                                                    }
                                                } else {
                                                    ((element as SVGElement).style as any)[stylePropKey] = k;
                                                }
                                            }
                                        });
                                    })
                                })
                            }
                        }
                    });
            });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataschema, schemaTypeInfoPropertiesChain, isSmall, isXSmall, isLarge]);

    const longPressBinder = useLongPress(
        () => {
            transformComponentRef.current!.setTransform(0, 0, 1);
        }, {
        threshold: 250,
        cancelOnMovement: 5,
        captureEvent: true,
    });

    const mnemoschemaClickHandler = useCallback((event: MouseEvent) => {
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

        document.querySelectorAll("[data-app-popover]").forEach(element => {
            try {
                element.remove();
            } catch (error) {
                console.error(error);
            }
        });

        const root = document.createElement("div");
        root.setAttribute("data-app-popover", "");
        document.body.appendChild(root);

        let value = propertyInfo.propertiesChainValuePair.value;
        if (propertyInfo.typeInfo?.isEnum) {
            const enumDescription = dataschema.$defs[propertyInfo.typeInfo?.typeName].enumDescriptions[value]?.split(' - ').pop();
            value = enumDescription ? enumDescription + ' (' + value + ')' : `<span style='color: red'>Ошибка (${value})</span>`
        } else {
            const unit = propertyInfo.typeInfo?.unit;
            value = `${value}${unit ? ' ' + unit : ''}`;
        }

        const html = `
                   <table class='simple-grid'>
                        <thead>
                            <tr><th colspan='2'>${propertyInfo.typeInfo?.ui.editor.label.text ?? ''}</th></tr>
                        </thead>
                       <tbody>
                            <tr><td>Свойство:</td><td>${propertyInfo.propertiesChainValuePair.propertiesChain}</td></tr>
                            <tr><td>Тип:</td><td>${propertyInfo.typeInfo?.typeName}</td></tr>
                            <tr><td>Значение:</td><td>${value}</td></tr>
                       </tbody>
                   </table>
                `;
        popoverInstance.current = new dxPopover(root, {
            minWidth: 200,
            shading: false,
            hideOnOutsideClick: true,
            contentTemplate: () => {
                const div = document.createElement("div");
                div.innerHTML = html;
                return div;
            },
            position: {
                at: "top left",
                my: "top left",
                of: window,
                offset: {
                    x: event.clientX,
                    y: event.clientY
                },
            }
        });

        popoverInstance.current.show();
    }, [dataschema, schemaTypeInfoPropertiesChain]);

    useEffect(() => {
        if (!containerRef.current || !mnemoschema) {
            return;
        }
        let mnemoschemaElement: HTMLElement | undefined = undefined;

        try {
            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');
            containerRef.current.innerHTML = '';

            stateSetup(mnemoschemaDoc.documentElement);

            if (onBeforeMount) {
                onBeforeMount(mnemoschemaDoc.documentElement);
            }

            mnemoschemaElement = containerRef.current.appendChild(mnemoschemaDoc.documentElement);

            if (onAfterMount) {
                onAfterMount(mnemoschemaElement);
            }
        } catch (error) {
            console.error(error);
        }

        mnemoschemaElement?.addEventListener('click', mnemoschemaClickHandler);

        return () => {
            mnemoschemaElement?.removeEventListener('click', mnemoschemaClickHandler);
        };
    }, [mnemoschema, onBeforeMount, onAfterMount, stateSetup, schemaTypeInfoPropertiesChain, dataschema, mnemoschemaClickHandler]);

    useEffect(() => {
        const timer = setTimeout(() => {
            // debugger
            const savedState = localStorage.getItem(`mnemoschema_transformed_state_${flowCode}`);
            if (savedState && transformComponentRef.current) {
                try {
                    const { scale, positionX, positionY } = JSON.parse(savedState);
                    transformComponentRef.current.setTransform(positionX, positionY, scale);
                } catch (e) {
                    console.error("Failed to restore transform state", e);
                }
            }
            setIsInitComplete(true);
        }, 500);

        return () => clearTimeout(timer);
    }, [flowCode]);

    return (
        <>
            {mnemoschema
                ?
                <TransformWrapper ref={transformComponentRef}
                    doubleClick={{ step: 1 }}
                    minScale={0.5}
                    onTransformed={(_, transformedState) => {
                        if (isInitComplete) {
                            localStorage.setItem(`mnemoschema_transformed_state_${flowCode}`, JSON.stringify(transformedState));
                        }
                    }}
                >
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                        <div {...longPressBinder()} style={{ display: 'flex', alignItems: 'center', opacity: (isValidDeviceState ? 1 : 0.7) }} ref={containerRef} />
                    </TransformComponent>
                </TransformWrapper>
                : null
            }
        </>
    );
}