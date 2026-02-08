const { Op, literal  } = require('sequelize');
const { UserDeviceLinkDataModel, DeviceStateDataModel } = require('../orm/models');
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
        msg.statusCode = HttpStatusCodes.Forbidden;
        msg.payload = { message: `Запрашиваемое устройство не принадлежит пользователю с ID ${userId}.` }

        return msg;
    }

    const state = global.get(`deviceState${deviceId}`);

    if (!state) {
        const deviceState = await DeviceStateDataModel.findOne({
            where: {
                deviceId: deviceId,
                [Op.and]: [
                    literal(`state::text != '"{}"'`),
                    { state: { [Op.ne]: null } }
                ]
            },
            order: [['createdAt', 'DESC']]
        });

        if (deviceState) {
            msg.payload = {
                values: {
                    ...deviceState,
                    state: { isConnected: false, ...JSON.parse(deviceState.state)}
                }
            };
        } else {
            msg.statusCode = HttpStatusCodes.InternalServerError;
            msg.payload = { message: `Состояние устройства с ID: ${deviceId} не существует.` }
        }
    } else {
        msg.payload = {
            values: {
                id: 0,
                deviceId: deviceId,
                state: {isConnected: true, ...state, },
                createdAt: new Date(),
                updatedAt: new Date()
            }
        };
    }

    return msg;
}

module.exports = {
    getDeviceState
}