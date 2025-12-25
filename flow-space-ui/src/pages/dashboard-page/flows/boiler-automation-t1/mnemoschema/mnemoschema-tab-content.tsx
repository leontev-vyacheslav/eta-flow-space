import { useDashboardPage } from "../../../dashboard-page-context";
import { Mnemoschema } from "../../../components/mnemoschema/mnemoschema";
import { useCallback, useEffect } from "react";
import { useScreenSize } from "../../../../../utils/media-query";
import { getKeyValuePairs } from "../../../../../helpers/data-helper";
import { RegestryDescriptions } from "../models/enums/descriptions/regestry-descriptions";


const MnemoschemaTabContent = () => {
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { deviceState } = useDashboardPage();

    const stateSetupHandler = useCallback(() => {

        if (deviceState) {
            const stateKeyValuePairs = getKeyValuePairs(deviceState.state);
            setTimeout(() => {
                stateKeyValuePairs.forEach(p => {
                    const element = document.querySelector(`svg [data-state="${p.key}"]`);
                    if (element) {
                        const dataTypeAttr = element.getAttribute("data-type");
                        if (dataTypeAttr) {
                            const value = RegestryDescriptions[`${dataTypeAttr}Descriptions`][p?.value as number];
                            element.innerHTML = value;
                        }
                        else {
                            element.innerHTML = p?.value;
                        }
                    }
                });
            }, 10);
        }

    }, [deviceState]);

    useEffect(() => {
        stateSetupHandler();
    }, [stateSetupHandler]);

    return (
        <>
            <Mnemoschema onMount={(mnemoschemaElement: HTMLElement) => {
                mnemoschemaElement.setAttribute("height", isSmall || isXSmall ? '450px' : isLarge ? '560px' : '640px');
                if (isSmall || isXSmall) {
                    mnemoschemaElement.style.flex = '1';
                }
            }} />
        </>
    );
}

export default MnemoschemaTabContent;