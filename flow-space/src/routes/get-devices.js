const { DeviceDataModel, FlowDataModel, UserDeviceLinkDataModel } = require('../orm/models');

async function getDevices(msg) {
    const { userId } = msg.req.user;

    const devices = await DeviceDataModel.findAll({
        include: [{
            model: FlowDataModel,
            as: 'flow',
            attributes: ["uid"],
        }, {
            model: UserDeviceLinkDataModel,
            as: 'userDeviceLinks',
            where: {
                userId: userId
            },
            attributes: [],
        }]
    });

    msg.payload = { values: devices };

    return msg;
}

module.exports = {
    getDevices
}