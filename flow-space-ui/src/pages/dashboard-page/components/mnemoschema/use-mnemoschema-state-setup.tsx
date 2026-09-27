import { useCallback } from "react";
import { useDashboardPage } from "../../dashboard-page-context";
import { useScreenSize } from "../../../../utils/media-query";
import { formatDateTime, formatNumber, getEnumDescription, isDateTime } from "../../../../helpers/state-value-format";

export const useMnemoschemaStateSetup = () => {
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { schemasTypeInfoPropertiesChain, dataschemas, deviceStates } = useDashboardPage();

    const applyStateToMultiStateElements = useCallback((mnemoschemaElement: HTMLElement) => {
        [...mnemoschemaElement.querySelectorAll(`[data-state]`)]
            .filter(element => element.getAttribute('data-state-eval') && element.getAttribute('data-state')?.includes(';'))
            .forEach(element => {
                const states: Record<string, any> = {};
                for (const deviceCode of Object.keys(deviceStates as Record<string, any>)) {
                    states[deviceCode] = (deviceStates as Record<string, any>)[deviceCode].state;
                }
                const dataStateEvalAttr = element.getAttribute('data-state-eval');
                if (dataStateEvalAttr && states) {
                    try {
                        eval(dataStateEvalAttr);
                    }
                    catch (error) {
                        console.error(`Error evaluating expression: ${dataStateEvalAttr}`, error);
                    }
                }
            });
    }, [deviceStates]);

    const applyStateToTextElement = useCallback((element: Element, key: string, value: any, typeInfo: any) => {
        if (!dataschemas || !dataschemas[key] || !typeInfo) {
            return;
        }

        if (typeInfo?.isEnum) {
            // the diagram has little room: drop the "(...)" remark and hide unused values
            const enumDescription = getEnumDescription(dataschemas[key], typeInfo.typeName, value)?.split('(')[0].trim();
            if (enumDescription === undefined) {
                // same message as the popover and map popup; built via DOM so the raw value is never parsed as markup
                const errorElement = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
                errorElement.style.fill = 'red';
                errorElement.textContent = `Ошибка (${value})`;
                element.replaceChildren(errorElement);
            } else {
                element.innerHTML = enumDescription === 'Не используется' ? '' : enumDescription;
            }
        } else {
            if (typeInfo?.typeName === 'number') {
                value = formatNumber(value, typeInfo);
            }

            const unit = typeInfo && typeInfo.unit;
            if (unit) {
                element.innerHTML = `${value} ${unit}`;
            } else {
                if (isDateTime(typeInfo)) {
                    value = formatDateTime(value, element.getAttribute('data-state-format'));
                }
                element.innerHTML = value;
            }
            if (typeInfo?.label) {
                element.innerHTML = `${typeInfo?.label} ${element.innerHTML}`;
            }
        }
    }, [dataschemas]);

    const applyStateToColoringElement = useCallback((element: Element, value: any, typeInfo: any) => {
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
                            const hints = element.getAttribute('data-colorizer-hint');
                            if (hints) {
                                const hintArray = hints.split(';');
                                for (const hint of hintArray) {
                                    if (hint === stylePropKey) {
                                        ((element as SVGElement).style as any)[stylePropKey] = k;
                                    }
                                }
                            } else {
                                ((element as SVGElement).style as any)[stylePropKey] = k;
                            }
                        }
                    });
                })
            })
        }
    }, []);

    return useCallback((mnemoschemaElement: HTMLElement) => {
        if (!schemasTypeInfoPropertiesChain || Object.keys(schemasTypeInfoPropertiesChain).length === 0) {
            return;
        }

        applyStateToMultiStateElements(mnemoschemaElement);
        for (const key of Object.keys(schemasTypeInfoPropertiesChain)) {
            const schemaTypeInfoPropertiesChain = schemasTypeInfoPropertiesChain[key];

            schemaTypeInfoPropertiesChain
                .forEach(({ typeInfo, propertiesChainValuePair }) => {
                    mnemoschemaElement.querySelectorAll(`[data-state="states['${key}'].${propertiesChainValuePair.propertiesChain}"]`)
                        .forEach(element => {
                            const value = propertiesChainValuePair.value;

                            if (element.tagName === 'text') {
                                applyStateToTextElement(element, key, value, typeInfo);
                            } else if (typeInfo?.ui.colorizer) {
                                applyStateToColoringElement(element, value, typeInfo);
                            }

                            const states: Record<string, any> = {};
                            for (const deviceCode of Object.keys(deviceStates as Record<string, any>)) {
                                states[deviceCode] = (deviceStates as Record<string, any>)[deviceCode].state;
                            }
                            const dataStateEvalAttr = element.getAttribute('data-state-eval');
                            if (dataStateEvalAttr && states) {
                                try {
                                    eval(dataStateEvalAttr);
                                } catch (error) {
                                    console.error(`Error evaluating expression: ${dataStateEvalAttr}`, error);
                                }
                            }
                        });
                });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataschemas, schemasTypeInfoPropertiesChain, isSmall, isXSmall, isLarge, deviceStates, applyStateToMultiStateElements, applyStateToTextElement, applyStateToColoringElement]);
}