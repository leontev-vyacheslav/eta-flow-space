const { differenceInMinutes } = require('date-fns');
const { DeviceDataModel, DeviceStateDataModel, sequelize } = require('../orm/models');

async function storeStates(msg, global) {
    const devices = await DeviceDataModel.findAll({
        attributes: ['id', 'updateStateInterval', 'lastStateUpdate'],
    });

    for (const device of devices) {
        const now = new Date();
        const deviceState = global.get(`deviceState${device.id}`);

        if (!deviceState || Object.keys(deviceState).length === 0 || !deviceState.timestamp) {
            continue;
        }

        if (differenceInMinutes(now, deviceState.timestamp) > 1) {
            Object.keys(deviceState).forEach(key => {
                deviceState[key] = undefined;
            });
            global.set(`deviceState${device.id}`, deviceState);
            continue;
        }

        if (!device.lastStateUpdate || differenceInMinutes(now, device.lastStateUpdate) >= device.updateStateInterval) {
            try {
                await sequelize.transaction(async t => {
                    await DeviceStateDataModel.create(
                        { deviceId: device.id, state: deviceState },
                        { transaction: t }
                    );
                    await DeviceDataModel.update(
                        { lastStateUpdate: now },
                        { where: { id: device.id } },
                        { transaction: t }
                    );
                });
            } catch (error) {
                console.log(`The device state update transaction failed due to the error: ${error}`);
            }
        }
    }

    return msg;
}

module.exports = {
    storeStates
}