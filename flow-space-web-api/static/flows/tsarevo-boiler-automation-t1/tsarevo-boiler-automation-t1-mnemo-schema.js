export function create({ signal } = {}) {
    const xSmallMedia = window.matchMedia('(max-width: 599.99px)');
    const smallMedia = window.matchMedia('(min-width: 600px) and (max-width: 959.99px)');
    const mediumMedia = window.matchMedia('(min-width: 960px) and (max-width: 1279.99px)');
    const largeMedia = window.matchMedia('(min-width: 1280px)');

    function applyMnemoschemaSize(mnemoschemaElement) {
        const isXSmall = xSmallMedia.matches;
        const isSmall = smallMedia.matches;
        const isLarge = largeMedia.matches;

        const height = (isSmall || isXSmall) ? '450px'
            : isLarge ? '540px'
                : '640px';

        mnemoschemaElement.setAttribute('height', height);
        mnemoschemaElement.setAttribute('width', '100%');
        mnemoschemaElement.style.flex = (isSmall || isXSmall) ? '1' : '';
    }

    function setLevelSupplyWaterTank(mnemoschemaElement, deviceState) {
        const baseBottom = 555;

        const supplyWaterLevelElement = mnemoschemaElement.querySelector('[data-section="supplyWaterLevel"] rect');
        if (!supplyWaterLevelElement) {
            return;
        }
        supplyWaterLevelElement?.setAttribute('height', '0');
        if (!deviceState.state.isSupplyWaterLevelEmergencyMin && !deviceState.state.isSupplyWaterLevelWorkingMin && !deviceState.state.isSupplyWaterLevelWorkingMax && !deviceState.state.isSupplyWaterLevelEmergencyMax) {
            supplyWaterLevelElement.style.display = 'none';
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
                supplyWaterLevelElement.setAttribute('y', baseBottom - level.height);
                return;
            }
        }

        supplyWaterLevelElement.setAttribute('height', levels.pop()?.height ?? 0);
    }

    return {
        onBeforeMount(mnemoschemaElement, deviceState) {
            applyMnemoschemaSize(mnemoschemaElement);
            if (deviceState && deviceState.state) {
                setLevelSupplyWaterTank(mnemoschemaElement, deviceState);
            }
        },

        onAfterMount(mnemoschemaElement, deviceState) {
            const resizeHandler = () => applyMnemoschemaSize(mnemoschemaElement);
            xSmallMedia.addEventListener('change', resizeHandler, { signal });
            smallMedia.addEventListener('change', resizeHandler, { signal });
            mediumMedia.addEventListener('change', resizeHandler, { signal });
            largeMedia.addEventListener('change', resizeHandler, { signal });
        },
    };
}