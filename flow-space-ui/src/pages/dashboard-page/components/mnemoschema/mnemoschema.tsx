import { useCallback, useEffect, useRef, useState } from "react";
import { useLongPress } from "use-long-press";
import { useDashboardPage } from "../../dashboard-page-context";
import { useScreenSize } from "../../../../utils/media-query";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef} from "react-zoom-pan-pinch";
import { useParams } from "react-router";


export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const { flowCode } = useParams();
    const { mnemoschema, isValidDeviceState, dataschema, schemaTypeInfoPropertiesChain } = useDashboardPage();
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const containerRef = useRef<HTMLDivElement>(null);
    const transformComponentRef = useRef<ReactZoomPanPinchRef | null>(null);
    const [isInitComplete, setIsInitComplete] = useState<boolean>(false);

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

    const longPressBinder = useLongPress(
        () => {
            transformComponentRef.current!.setTransform(0, 0, 1);
        }, {
        threshold: 500,
        cancelOnMovement: 25,
        captureEvent: true,
    });

    useEffect(() => {
        if (!containerRef.current || !mnemoschema) {
            return;
        }

        try {
            const parser = new DOMParser();
            const mnemoschemaDoc = parser.parseFromString(mnemoschema, 'image/svg+xml');
            containerRef.current.innerHTML = '';

            stateSetup(mnemoschemaDoc.documentElement);

            if (onBeforeMount) {
                onBeforeMount(mnemoschemaDoc.documentElement);
            }

            const mnemoschemaElement = containerRef.current.appendChild(mnemoschemaDoc.documentElement);

            if (onAfterMount) {
                onAfterMount(mnemoschemaElement);
            }

        } catch (error) {
            console.error(error);
        }
    }, [mnemoschema, onBeforeMount, onAfterMount, stateSetup]);

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
                        <div {...longPressBinder()} style={{ display: 'flex', alignItems: 'center', opacity: (isValidDeviceState ? 1 : 0.8) }} ref={containerRef} />
                    </TransformComponent>
                </TransformWrapper>
                : null
            }
        </>
    );
}