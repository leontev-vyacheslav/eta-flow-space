const { UserDeviceLinkDataModel } = require('../orm/models');
const { HttpStatusCodes } = require('../constants');

async function getDeviceState(msg, global) {
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

    const state = global.get(`deviceState${deviceId}`);
    if (!state) {
        msg.statusCode = HttpStatusCodes.InternalServerError;
        msg.payload = { message: `Состояние устройства с ID: ${deviceId} не существует.` }

        return msg;
    }

    msg.payload = {
        values: {
            id: 0,
            deviceId: deviceId,
            state: state,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    };

    return msg;
}

module.exports = {
    getDeviceState
}