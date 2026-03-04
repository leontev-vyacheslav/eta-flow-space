const { Op, literal } = require('sequelize');
const { DeviceDataModel, EmergencyDataModel, DeviceStateDataModel, EmergencyStateDataModel, sequelize } = require('../orm/models');

async function storeEmergencyStates(msg, global) {
    const devices = await DeviceDataModel.findAll({
        attributes: ['id', 'updateStateInterval', 'lastStateUpdate'],
        include: [{
            model: EmergencyDataModel,
            as: 'emergencies',
            attributes: ["reasons"],
        }]
    });

    const emergencyStates = [];
    for (const device of devices) {
        let state = global.get(`deviceState${device.id}`);
        let stateIsMissing = false;
        const emergencyReasons = [];

        if (!device.emergencies) {
            global.set(`emergencyState${device.id}`, undefined);

            continue;
        }

        if (state) {
            const stateKeys = Object.keys(state);
            if (stateKeys.every(k => state[k] === undefined || state[k] === null) || stateKeys.length === 0) {
                stateIsMissing = true;
            }
        } else {
            stateIsMissing = true;
        }

        if (stateIsMissing) {
            const deviceState = await DeviceStateDataModel.findOne({
                where: {
                    deviceId: device.id,
                    [Op.and]: [
                        literal(`state::text <> '{}'`),
                        { state: { [Op.ne]: null } }
                    ]
                },
                order: [['createdAt', 'DESC']]
            });

            if (deviceState) {
                state = deviceState.state;
            }

            emergencyReasons.push({
                id: 100,
                expression: "state.isConnected === false",
                description: "Связь отсутствует."
            })
        }

        device.emergencies.reasons.forEach(emergencyReason => {
            const result = eval(emergencyReason.expression);
            if (result === true) {
                emergencyReasons.push(emergencyReason);
            }
        });

        const emergencyState = emergencyReasons.length === 0
            ? undefined
            : {
                reasons: emergencyReasons,
                timestamp: Date.now(),
            };

        global.set(`emergencyState${device.id}`, emergencyState);

        if (emergencyState) {
            emergencyStates.push({
                deviceId: device.id,
                state: emergencyState
            });
        }
    }

    if (emergencyStates.length > 0) {
        try {
            await sequelize.transaction(async t => {
                await EmergencyStateDataModel.bulkCreate(emergencyStates, { transaction: t });
            });
        } catch (error) {
            console.log(`The devices emergency states update failed due to the error: ${error}`);
        }
    }

    return msg;
}

module.exports = {
    storeEmergencyStates
}