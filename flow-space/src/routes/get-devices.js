const { DeviceDataModel, FlowDataModel, UserDeviceLinkDataModel, ObjectLocationDataModel, ReportDataModel } = require('../orm/models');

async function getDevices(msg) {
    const { userId } = msg.req.user;

    const devices = await DeviceDataModel.findAll({
        include: [{
            model: FlowDataModel,
            as: 'flow',
        }, {
            model: ObjectLocationDataModel,
            as: 'objectLocation',
        }, {
            model: UserDeviceLinkDataModel,
            as: 'userDeviceLinks',
            where: {
                userId: userId
            },
            attributes: [],
        }, {
            model: ReportDataModel,
            as: 'reports',
        }]
    });

    msg.payload = { values: devices };

    return msg;
}

module.exports = {
    getDevices
}