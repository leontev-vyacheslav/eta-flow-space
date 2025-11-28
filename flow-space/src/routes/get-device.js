const { DeviceDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel, FlowDataModel } = require('../orm/models');

async function getDevice(msg) {
    const { userId } = msg.req.user;
    const deviceId = parseInt(msg.req.params.deviceId);

    const userDeviceLink = await UserDeviceLinkDataModel.findOne({
        where: {
            userId,
            deviceId
        }
    });

    if (!userDeviceLink) {
        msg.statusCode = HttpStatusCodes.Forbiden;
        msg.payload = { message: `Запрашиваемое устройство не принадлежит пользователю с ID ${userId}.` }

        return msg;
    }

    const device = await DeviceDataModel.findOne({
        include: [{
            model: ObjectLocationDataModel,
            as: 'objectLocation',
        },
        {
            model: FlowDataModel,
            as: 'flow',
        }],
        where: {
            id: deviceId
        }
    });

    msg.payload = { values: device };

    return msg;
}

module.exports = {
    getDevice
}