function setPathHeight(pathElement, newHeight) {
    const d = pathElement.getAttribute('d');
    if (!d) {
        return;
    }
    const updatedD = d.replace(/v-(\d+\.?\d*)/g, `v-${newHeight}`);
    pathElement.setAttribute('d', updatedD);
}

function setLevelSuppyWaterTank(mnemoschemaElement, deviceState) {
    // console.log('setLevelSuppyWaterTank');
    const supplyWaterLevelElement = mnemoschemaElement.querySelector('[data-state="isSupplyWaterLevel"]');
    if (!supplyWaterLevelElement) {
        return;
    }
    // [
    //     'isSupplyWaterLevelEmergencyMax',
    //     'isSupplyWaterLevelWorkingMax',
    //     'isSupplyWaterLevelWorkingMin',
    //     'isSupplyWaterLevelEmergencyMin'
    // ].forEach(p => {
    //     const levelStateElement = mnemoschemaElement.querySelector(`[data-state="${p}"]`);
    //     if (levelStateElement) {
    //         levelStateElement.style.display = 'inline';
    //     }
    // });

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

export function create(config) {
    return {
        onBeforeMount(mnemoschemaElement, deviceState) {
            // console.log('onBeforeMount');
        },

        onAfterMount(mnemoschemaElement, deviceState) {
            if (deviceState && deviceState.state) {
                setLevelSuppyWaterTank(mnemoschemaElement, deviceState);
            }
        },
    };
}