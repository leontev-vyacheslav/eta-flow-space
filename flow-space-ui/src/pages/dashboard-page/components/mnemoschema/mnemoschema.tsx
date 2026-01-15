import { useCallback, useEffect, useRef } from "react";
import { useDashboardPage } from "../../dashboard-page-context";
import { useScreenSize } from "../../../../utils/media-query";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const mnemoschemaContainerRef = useRef<HTMLDivElement>(null);
    const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);

    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { mnemoschema, isValidDeviceState, dataschema, schemaTypeInfoPropertiesChain } = useDashboardPage();

    const stateSetup = useCallback((mnemoschemaElement: HTMLElement) => {
        if (schemaTypeInfoPropertiesChain) {
            schemaTypeInfoPropertiesChain
                .forEach(({ typeInfo, propertiesChainValuePair }) => {
                    mnemoschemaElement.querySelectorAll(`[data-state="${propertiesChainValuePair.propertiesChain}"]`)
                        .forEach(element => {
                            const value = propertiesChainValuePair.value;
                            if (!typeInfo?.ui.colorizer) {
                                if (typeInfo?.isEnum) {
                                    element.innerHTML = dataschema.$defs[typeInfo.typeName].enumDescriptions[value].split(' - ').pop();
                                } else {
                                    const unit = typeInfo && typeInfo.unit;
                                    if (unit) {
                                        element.innerHTML = `${value} ${unit ? unit : ''}`;
                                    } else {
                                        element.innerHTML = value;
                                    }
                                }
                            } else {
                                const styleProps = typeInfo?.ui.colorizer.styleProps;
                                if (styleProps) {
                                    // "styleProps": [ ... ]
                                    styleProps.forEach((styleProp: any) => {
                                        Object.keys(styleProp).forEach(stylePropKey => {
                                            //  "fill": {...}
                                            const stylePropObj = styleProp[stylePropKey];
                                            Object.keys(stylePropObj).forEach(k => {
                                                // "red": true
                                                if (stylePropObj[k] === value) {
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

    useEffect(() => {
        if (!mnemoschemaContainerRef.current || !mnemoschema) {
            return;
        }

        try {
            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');
            mnemoschemaContainerRef.current.innerHTML = '';

            stateSetup(mnemoschemaDoc.documentElement);

            if (onBeforeMount) {
                onBeforeMount(mnemoschemaDoc.documentElement);
            }

            const mnemoschemaElement = mnemoschemaContainerRef.current.appendChild(mnemoschemaDoc.documentElement);

            if (onAfterMount) {
                onAfterMount(mnemoschemaElement);
            }
        } catch (error) {
            console.error(error);
        }
    }, [mnemoschema, onBeforeMount, onAfterMount, stateSetup]);

    return (
        <>
            {mnemoschema
                ?
                <TransformWrapper ref={transformComponentRef}>
                    {({ zoomIn, zoomOut, resetTransform}) => (
                        <>
                            <TransformComponent>
                                 <div style={{ display: 'flex', alignItems: 'center', opacity: (isValidDeviceState ? 1 : 1) }} ref={mnemoschemaContainerRef} />
                            </TransformComponent>
                            <div className="tools">
                                <button onClick={() => zoomIn()}>+</button>
                                <button onClick={() => zoomOut()}>-</button>
                                <button onClick={() => resetTransform()}>x</button>
                            </div>
                        </>
                    )}

                </TransformWrapper>
                : null
            }
        </>
    );
}