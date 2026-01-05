import { useCallback, useEffect, useRef } from "react";
import { useDashboardPage } from "../../dashboard-page-context";
import { getSchemaTypeInfo } from "../../../../helpers/data-helper";
import { useScreenSize } from "../../../../utils/media-query";

export const Mnemoschema = ({ onBeforeMount: onBeforeMount, onAfterMount: onAfterMount }: { onBeforeMount?: (mnemoschemaElement: HTMLElement) => void, onAfterMount?: (mnemoschemaElement: HTMLElement) => void }) => {
    const mnemoschemaContainerRef = useRef<HTMLDivElement>(null);
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { mnemoschema, isValidDeviceState, dataschema, statePropertiesChainValuePairs } = useDashboardPage();

    const stateSetup = useCallback((mnemoschemaElement: HTMLElement) => {
        if (statePropertiesChainValuePairs) {
            statePropertiesChainValuePairs.forEach(p => {
                const element = mnemoschemaElement.querySelector(`[data-state="${p.propertiesChain}"]`);
                if (element) {
                    const typeInfo = getSchemaTypeInfo(p.propertiesChain, dataschema);
                    const unit = typeInfo && typeInfo.unit;
                    const dimension = typeInfo && typeInfo.dimension;

                    if (typeInfo?.isEnum) {
                        const value = dataschema.$defs[typeInfo.typeName].enumDescriptions[p.value].split(' - ').pop()
                        element.innerHTML = value;
                    } else {
                        if (typeof p.value === 'number' && Number.isFinite(p.value)) {
                            element.innerHTML = `${dimension ? Math.round(p.value * dimension * 100) / 100 : Math.round(p.value * 100) / 100} ${unit ? unit : ''}`;
                        } else {
                            element.innerHTML = p.value;
                        }
                    }
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataschema, statePropertiesChainValuePairs, isSmall, isXSmall, isLarge]);

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

            if(onAfterMount) {
                onAfterMount(mnemoschemaElement);
            }
        } catch (error) {
            console.error( error);
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