const { Op, col } = require('sequelize');
const { DeviceDataModel, UserDeviceLinkDataModel, EmergencyStateDataModel } = require('../orm/models');

async function getUserEmergencyStatesByDates(msg) {
    const { userId } = msg.req.user;
    const beginDateStr = msg.req.query.beginDate;
    const endDateStr = msg.req.query.endDate;

    const beginDate = new Date(beginDateStr);
    const endDate = new Date(endDateStr);

    const states = await EmergencyStateDataModel.findAll({
        attributes: [
            'id',
            'deviceId',
            [col('device.name'), 'deviceName'],
            'state',
            'createdAt'
        ],
        include: [
            {
                model: DeviceDataModel,
                as: 'device',
                required: true,
                attributes: [],
                include: [
                    {
                        model: UserDeviceLinkDataModel,
                        as: 'userDeviceLinks',
                        required: true,
                        attributes: [],
                        where: {
                            userId: userId
                        }
                    }
                ]
            }
        ],
        where: {
            createdAt: {
                [Op.between]: [beginDate, endDate]
            },
        }
    });

    msg.payload = { values: states };

    return msg;
}

module.exports = {
    getUserEmergencyStatesByDates
}