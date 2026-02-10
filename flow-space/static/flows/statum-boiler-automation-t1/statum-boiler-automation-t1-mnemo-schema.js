
function setLevelSupplyWaterTank(mnemoschemaElement, deviceState) {
    const supplyWaterLevelElement = mnemoschemaElement.querySelector('[data-section="supplyWaterLevel"] rect');
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
            supplyWaterLevelElement.setAttribute('height', level.height);
            return;
        }
    }

   supplyWaterLevelElement.setAttribute('height', levels.pop()?.height ?? 0);
}

export function create(config) {
    return {
        onBeforeMount(mnemoschemaElement, deviceState) {
            if (deviceState && deviceState.state) {
                setLevelSupplyWaterTank(mnemoschemaElement, deviceState);
            }
        },

        onAfterMount(mnemoschemaElement, deviceState) {
            //
        },
    };
}