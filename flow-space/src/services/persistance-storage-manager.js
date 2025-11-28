const { differenceInMinutes } = require('date-fns');
const { DeviceDataModel, DeviceStateDataModel, sequelize } = require('../orm/models');

async function storeStates(msg, global) {
    const devices = await DeviceDataModel.findAll({
        attributes: ['id', 'updateStateInterval', 'lastStateUpdate'],
    });

    devices.forEach(async (d) => {
        const now = new Date();
        if (!d.lastStateUpdate || differenceInMinutes(now, d.lastStateUpdate) >= d.updateStateInterval) {
            const deviceState = global.get(`deviceState${d.id}`);

            if (deviceState) {
                try {
                    await sequelize.transaction(async t => {
                        await DeviceStateDataModel.create(
                            {
                                deviceId: d.id,
                                state: JSON.stringify(deviceState)
                            },
                            { transaction: t }
                        );

                        await DeviceDataModel.update(
                            { lastStateUpdate: now },
                            {
                                where: {
                                    id: d.id,
                                },
                            },
                            { transaction: t }
                        );
                    });
                } catch (error) {
                    console.log(`The device state update transaction failed due to the error: ${error}`);
                }
            }
        }
    });

    return msg;
}

module.exports = {
    storeStates
}