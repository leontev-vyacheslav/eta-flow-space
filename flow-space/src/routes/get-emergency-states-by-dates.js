const { UserDeviceLinkDataModel, EmergencyStateDataModel } = require('../orm/models');

async function getEmergencyStatesByDates(msg) {
    const { userId } = msg.req.user;
    const deviceId = parseInt(msg.req.params.deviceId);
    const beginDateStr = msg.req.query.beginDate;
    const endDateStr = msg.req.query.endDate;

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
    const states = await EmergencyStateDataModel.findAll({
        attributes: [
            'id',
            'deviceId',
            'state',
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
    getEmergencyStatesByDates
}