const { differenceInMinutes } = require('date-fns');
const { DeviceDataModel, EmergencyDataModel, sequelize } = require('../orm/models');

async function storeEmergencyStates(msg, global) {
    const devices = await DeviceDataModel.findAll({
        attributes: ['id', 'updateStateInterval', 'lastStateUpdate'],
        include: [{
            model: EmergencyDataModel,
            as: 'emergencies',
            attributes: ["reasons"],
        }]
    });

    devices.forEach(device => {
        const state = global.get(`deviceState${device.id}`);
        let stateIsMissing = false;
        if (state) {
            const stateKeys = Object.keys(state);
            if (stateKeys.every(k => state[k] === undefined || state[k] === null) || stateKeys.length === 0) {
                stateIsMissing = true;
            }
        } else {
            stateIsMissing = true;
        }

        if (stateIsMissing) {
            global.set(`emergencyState${device.id}`, {
                reasons: [
                    {
                        id: 100,
                        expression: "state.isConnected === false",
                        description: "Связь отсутствует."
                    }
                ],
                timestamp: Date.now(),
            });

            return;
        }

        if (!device.emergencies) {
            global.set(`emergencyState${device.id}`, undefined);
            
            return;
        }

        const emergencyReasons = [];

        device.emergencies.reasons.forEach(emergencyReason => {
            const result = eval(emergencyReason.expression);
            if (result === true) {
                emergencyReasons.push(emergencyReason);
            }
        });

        if (emergencyReasons.length === 0) {
            global.set(`emergencyState${device.id}`, undefined);
        } else {
            global.set(`emergencyState${device.id}`, {
                reasons: emergencyReasons,
                timestamp: Date.now(),
            });
        }
    });
}

module.exports = {
    storeEmergencyStates
}