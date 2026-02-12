const { Op, json } = require('sequelize');
const { UserDeviceLinkDataModel, DeviceStateDataModel } = require('../orm/models');
const { HttpStatusCodes } = require('../constants');

async function getDeviceStatesByDates(msg) {
    const { userId } = msg.req.user;

    const beginDateStr = msg.req.query.beginDate;
    const endDateStr = msg.req.query.endDate;
    const stateFieldsStr = msg.req.query.fields;
    const stateFields = stateFieldsStr ? stateFieldsStr
        .split(';')
        .map(f => {
            return [json(`state.${f}`), f];
        }): [];

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

    const beginDate = new Date(beginDateStr);
    const endDate = new Date(endDateStr);
    const states = await DeviceStateDataModel.findAll({
        attributes: [
            'id',
            'deviceId',
            ...stateFields,
            'createdAt'
        ],
        where: {
            deviceId: deviceId,
            createdAt: {
                [Op.between]: [beginDate, endDate]
            },
        },
    });

    msg.payload = { values: states };

    return msg;
}

module.exports = {
    getDeviceStatesByDates
}