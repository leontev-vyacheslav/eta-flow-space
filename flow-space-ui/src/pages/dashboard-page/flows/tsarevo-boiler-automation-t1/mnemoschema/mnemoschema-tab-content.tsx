import { Mnemoschema } from "../../../components/mnemoschema/mnemoschema";
import { useScreenSize } from "../../../../../utils/media-query";
import { useCallback } from "react";
import { useDashboardPage } from "../../../dashboard-page-context";
import { setPathHeight } from "../../../../../helpers/svg-helper";



const MnemoschemaTabContent = () => {
    const { isSmall, isXSmall, isLarge } = useScreenSize();
    const { deviceState } = useDashboardPage()

    const supplyWaterLevelHandler = useCallback((mnemoschemaElement: HTMLElement) => {
        if (deviceState && deviceState.state) {
            const supplyWaterLevelElement = mnemoschemaElement.querySelector('[data-state="isSupplyWaterLevel"]') as SVGPathElement;
            if (!supplyWaterLevelElement) {
                return;
            }

            const levels = [
                { state: deviceState.state.isSupplyWaterLevelEmergencyMax, height: 140 },
                { state: deviceState.state.isSupplyWaterLevelWorkingMax, height: 120 },
                { state: deviceState.state.isSupplyWaterLevelWorkingMin, height: 60 },
                { state: deviceState.state.isSupplyWaterLevelEmergencyMin, height: 10 }
            ];
            for (const level of levels) {
                if (level.state) {
                    setPathHeight(supplyWaterLevelElement, level.height);
                    return;
                }
            }

            setPathHeight(
                supplyWaterLevelElement,
                levels.pop()?.height ?? 0
            );

        }
    }, [deviceState]);

    const onBeforeMountHandler = useCallback((mnemoschemaElement: HTMLElement) => {
        mnemoschemaElement.setAttribute("height", isSmall || isXSmall ? '450px' : isLarge ? '540px' : '640px');
        mnemoschemaElement.setAttribute("width", '100%');
        if (isSmall || isXSmall) {
            mnemoschemaElement.style.flex = '1';
        }
        supplyWaterLevelHandler(mnemoschemaElement);
    }, [isLarge, isSmall, isXSmall, supplyWaterLevelHandler]);

    return (
        <Mnemoschema onBeforeMount={onBeforeMountHandler} />
    );
}

export default MnemoschemaTabContent;