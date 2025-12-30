import { useDashboardPage } from "../../../dashboard-page-context";
import { Mnemoschema } from "../../../components/mnemoschema/mnemoschema";
import { useCallback, useEffect } from "react";
import { useScreenSize } from "../../../../../utils/media-query";
import { getKeyValuePairs, getSchemaTypeInfo } from "../../../../../helpers/data-helper";
import { RegestryDescriptions as RegestryEnumDescriptions } from "../models/enums/descriptions/regestry-enum-descriptions";


const MnemoschemaTabContent = () => {
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { deviceState, dataschema } = useDashboardPage();

    const stateSetup = useCallback(() => {
        if (deviceState) {
            const stateKeyValuePairs = getKeyValuePairs(deviceState.state);
            stateKeyValuePairs.forEach(p => {

                const element = document.querySelector(`svg [data-state="${p.key}"]`);
                if (element) {
                    const schemaTypeInfo = getSchemaTypeInfo(p.key, dataschema);
                    const isEnum = !!schemaTypeInfo && (!!dataschema.$defs[schemaTypeInfo.typeName] && !!dataschema.$defs[schemaTypeInfo.typeName].enum);
                    const unit = schemaTypeInfo && schemaTypeInfo.unit;

                    if (isEnum) {
                        const value = RegestryEnumDescriptions[`${schemaTypeInfo.typeName}Descriptions`][p?.value as number];
                        element.innerHTML = value;
                    }
                    else {
                        element.innerHTML = p?.value + (unit ? ` ${unit}` : '');
                    }
                }
            });
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataschema, deviceState, isSmall, isXSmall, isLarge]);

    useEffect(() => {
        if (dataschema) {
            // const t = getSchemaTypeInfo("boilers[0].mode", dataschema);
            // const t = getSchemaTypeInfo("testArray[4]", dataschema);
            // const t = getSchemaTypeInfo("tempRoomAir", dataschema);
            // const t = getSchemaTypeInfo("networkPumps[0].setPower", dataschema);
            // const t = getSchemaTypeInfo("boilers[3].powerBurner", dataschema);
            // const t = getSchemaTypeInfo1("flapHn.mode", dataschema);
            // console.log(t);
        }
    }, [dataschema]);

    useEffect(() => {
        setTimeout(() => {
            stateSetup();
        }, 10);
    }, [stateSetup]);

    return (
        <>
            <Mnemoschema onBeforeMount={(mnemoschemaElement: HTMLElement) => {
                mnemoschemaElement.setAttribute("height", isSmall || isXSmall ? '450px' : isLarge ? '540px' : '640px');
                if (isSmall || isXSmall) {
                    mnemoschemaElement.style.flex = '1';
                }
            }} />
        </>
    );
}

export default MnemoschemaTabContent;