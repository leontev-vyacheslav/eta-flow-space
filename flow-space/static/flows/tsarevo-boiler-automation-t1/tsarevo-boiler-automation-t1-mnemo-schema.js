function setPathHeight(pathElement, newHeight) {
    const d = pathElement.getAttribute('d');
    if (!d) {
        return;
    }
    const updatedD = d.replace(/v-(\d+\.?\d*)/g, `v-${newHeight}`);
    pathElement.setAttribute('d', updatedD);
}

function setLevelSuppyWaterTank(mnemoschemaElement, deviceState) {
    const supplyWaterLevelElement = mnemoschemaElement.querySelector('[data-state="isSupplyWaterLevel"]');
    if (!supplyWaterLevelElement) {
        return;
    }
    let isMaxLevel = false;
    const levels = [
        { state: 'isSupplyWaterLevelEmergencyMax', height: 140 },
        { state: 'isSupplyWaterLevelWorkingMax', height: 120 },
        { state: 'isSupplyWaterLevelWorkingMin', height: 60 },
        { state: 'isSupplyWaterLevelEmergencyMin', height: 10 }
    ];

    levels.forEach(p => {
        const levelStateElement = mnemoschemaElement.querySelector(`[data-state="${p.state}"]`);
        if (!levelStateElement) {
            return;
        }
        if (isMaxLevel) {
            levelStateElement.style.display = 'none';
            return;
        }
        if (deviceState.state[p.state] === true) {
            levelStateElement.style.display = 'inline';
            isMaxLevel = true;
        }
    });
    if (!isMaxLevel) {
        const isSupplyWaterLevelEmergencyMinElement = mnemoschemaElement.querySelector('[data-state="isSupplyWaterLevelEmergencyMin"]');
        if (isSupplyWaterLevelEmergencyMinElement) {
            isSupplyWaterLevelEmergencyMinElement.style.display = 'inline';
        }
    }

    for (const level of levels) {
        if (deviceState.state[level.state]) {
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
        },

        onAfterMount(mnemoschemaElement, deviceState) {
            if (deviceState && deviceState.state) {
                setLevelSuppyWaterTank(mnemoschemaElement, deviceState);
            }
        },
    };
}