import { useCallback } from "react";
import { useDashboardPage } from "../../dashboard-page-context";
import { useScreenSize } from "../../../../utils/media-query";
import AppConstants from "../../../../constants/app-constants";

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
                    eval(dataStateEvalAttr);
                }
            });
    }, [deviceStates]);

    const applyStateToTextElement = useCallback((element: Element, key: string, value: any, typeInfo: any) => {
        if (!dataschemas || !dataschemas[key] || !typeInfo) {
            return;
        }

        if (typeInfo?.isEnum) {
            try {
                const enumDescription = (dataschemas[key].$defs[typeInfo.typeName].enumDescriptions[value].split(' - ').pop() as string).split('(')[0].trim();
                element.innerHTML = enumDescription === 'Не используется' ? '' : enumDescription;
            } catch {
                element.innerHTML = '<tspan style="fill: red">Ошибка</tspan>'
            }
        } else {
            if (typeInfo?.typeName === 'number') {
                if (typeInfo?.formatting && typeInfo?.formatting.options) {
                    value = new Intl.NumberFormat(
                        typeInfo.formatting.locale ?? AppConstants.formatting.numberFormat.locale,
                        typeInfo.formatting.options
                    ).format(value);
                } else {
                    value = new Intl.NumberFormat(
                        AppConstants.formatting.numberFormat.locale,
                        AppConstants.formatting.numberFormat.options as any
                    ).format(value);
                }
            }

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
                                eval(dataStateEvalAttr);
                            }
                        });
                });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataschemas, schemasTypeInfoPropertiesChain, isSmall, isXSmall, isLarge, deviceStates, applyStateToMultiStateElements, applyStateToTextElement, applyStateToColoringElement]);
}