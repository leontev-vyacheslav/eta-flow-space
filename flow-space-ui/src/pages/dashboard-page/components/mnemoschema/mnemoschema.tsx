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
        if (schemaTypeInfoPropertiesChain) {
            schemaTypeInfoPropertiesChain
                .forEach(({ typeInfo, propertiesChainValuePair }) => {
                    mnemoschemaElement.querySelectorAll(`[data-state="${propertiesChainValuePair.propertiesChain}"]`)
                        .forEach(element => {
                            const value = propertiesChainValuePair.value;

                            if (element.tagName === 'text') {
                                if (typeInfo?.isEnum) {
                                    try {
                                        element.innerHTML = dataschema.$defs[typeInfo.typeName].enumDescriptions[value].split(' - ').pop();
                                    } catch (error) {
                                        console.error(`Enum description resolving error: type: ${typeInfo.typeName}, value: ${value}`);
                                    }
                                } else {
                                    const unit = typeInfo && typeInfo.unit;
                                    if (unit) {
                                        element.innerHTML = `${value} ${unit ? unit : ''}`;
                                    } else {
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
        }
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

        const mnemoschemaClickHandler = (event: MouseEvent) => {
            // debugger
            if (!(event.target instanceof SVGElement)) {
                return;
            }
            const dataStateAttr = (event.target as SVGElement).getAttribute('data-state');

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

            const content = document.querySelector("[data-app-popover]") as HTMLDivElement;

            let value = propertyInfo.propertiesChainValuePair.value;
            if (propertyInfo.typeInfo?.isEnum) {
                const enumDescription = dataschema.$defs[propertyInfo.typeInfo?.typeName].enumDescriptions[value]?.split(' - ').pop();
                value = enumDescription ? enumDescription + ' (' + value + ')' : value
            } else {
                const unit = propertyInfo.typeInfo?.unit;
                value = `${value}${unit ? ' ' + unit : ''}`;
            }

            content.innerHTML = `
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

            popoverInstance.current = new dxPopover(content, {
                target: event.target,
                minWidth: 200,
                shading: false,
                hideOnOutsideClick: true,
            });

            popoverInstance.current.show();
        };

        mnemoschemaElement?.addEventListener('click', mnemoschemaClickHandler);

        return () => {
            mnemoschemaElement?.removeEventListener('click', mnemoschemaClickHandler);
        };

    }, [mnemoschema, onBeforeMount, onAfterMount, stateSetup, schemaTypeInfoPropertiesChain, dataschema]);

    useEffect(() => {
        const timer = setTimeout(() => {
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
        }, 100);

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
                    <TransformComponent>
                        <div {...longPressBinder()} style={{ display: 'flex', alignItems: 'center', opacity: (isValidDeviceState ? 1 : 0.6) }} ref={containerRef} />
                    </TransformComponent>
                </TransformWrapper>
                : null
            }
        </>
    );
}