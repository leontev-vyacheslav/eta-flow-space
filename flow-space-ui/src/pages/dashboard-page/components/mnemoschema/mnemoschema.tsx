import { useCallback, useEffect, useRef } from "react";
import { useDashboardPage } from "../../dashboard-page-context";
import { useScreenSize } from "../../../../utils/media-query";

export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const mnemoschemaContainerRef = useRef<HTMLDivElement>(null);
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { mnemoschema, isValidDeviceState, dataschema, schemaTypeInfoPropertiesChain } = useDashboardPage();

    const stateSetup = useCallback((mnemoschemaElement: HTMLElement) => {
        if (schemaTypeInfoPropertiesChain) {
            schemaTypeInfoPropertiesChain
                .forEach(({ typeInfo, propertiesChainValuePair }) => {
                    const element = mnemoschemaElement.querySelector(`[data-state="${propertiesChainValuePair.propertiesChain}"]`);
                    if (element) {
                        const unit = typeInfo && typeInfo.unit;
                       // const dimension = typeInfo && typeInfo.dimension;
                        const value = propertiesChainValuePair.value;

                        if (typeInfo?.isEnum) {
                            element.innerHTML = dataschema.$defs[typeInfo.typeName].enumDescriptions[value].split(' - ').pop();
                        } else {
                            if (unit) {
                                element.innerHTML = `${value} ${unit ? unit : ''}`;
                            } else
                                {
                                element.innerHTML = value;
                            }
                        }
                    }
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
                ? <div id="mnemo-schema-wrapper" style={{ display: 'flex', alignItems: 'center', opacity: (isValidDeviceState ? 1 : 1) }} ref={mnemoschemaContainerRef} />
                : null
            }
        </>
    );
}