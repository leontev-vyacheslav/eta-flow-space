export function create(config) {
    return {
        onBeforeMount(mnemoschemaElement, deviceState) {
            console.log('onBeforeMount');
        },
        onAfterMount(mnemoschemaElement, deviceState) {
            if (deviceState && deviceState.state) {
                const supplyWaterLevelElement = mnemoschemaElement.querySelector('[data-state="isSupplyWaterLevel"]');
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
        },
    };
}