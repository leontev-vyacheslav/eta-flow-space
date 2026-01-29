import { useCallback } from "react";
import { useDashboardPage } from "../../dashboard-page-context";
import { useScreenSize } from "../../../../utils/media-query";

export const useMnemoschemaStateSetup = () => {
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { schemaTypeInfoPropertiesChain, dataschema } = useDashboardPage();


    return useCallback((mnemoschemaElement: HTMLElement) => {
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
}