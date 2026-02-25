const { UserDeviceLinkDataModel, DeviceDataModel } = require('../orm/models');

async function getEmergencyStates(msg, global) {
    const { userId } = msg.req.user;

    const devices = await DeviceDataModel.findAll({
        attributes: ['id'],
        include: [
            {
                model: UserDeviceLinkDataModel,
                required: true,
                as: 'userDeviceLinks',
                where: {
                    userId: userId
                },
                attributes: [],
            }
        ]
    });
    
    const states = [];
    devices.forEach(d => {
        const state = global.get(`emergencyState${d.id}`);
        if (state) {
            states.push({ deviceId: d.id, ...state })
        }
    });

    msg.payload = {
        values: states
    };

    return msg;
}

module.exports = {
    getEmergencyStates
}