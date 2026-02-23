const { differenceInMinutes, differenceInSeconds } = require('date-fns');
const { DeviceDataModel, DeviceStateDataModel, sequelize } = require('../orm/models');

async function storeEmergencyStates(msg, global) {
    const devices = await DeviceDataModel.findAll({
        attributes: ['id', 'updateStateInterval', 'lastStateUpdate'],
    });

    devices.forEach(device => {
        if (!d.lastStateUpdate || differenceInMinutes(now, d.lastStateUpdate) >= d.updateStateInterval) {
        }
    });
}

module.exports = {
    storeEmergencyStates
}