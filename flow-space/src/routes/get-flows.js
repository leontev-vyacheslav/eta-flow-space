const { DeviceDataModel, FlowDataModel, UserDeviceLinkDataModel } = require('../orm/models');

async function getFlows(msg) {
    const { userId } = msg.req.user;

    const flows = await FlowDataModel.findAll({
        attributes: ['id', 'code', 'name', 'description', 'uid'],
        include: [{
            model: DeviceDataModel,
            as: 'devices',
            include: [
                {
                    model: UserDeviceLinkDataModel,
                    as: 'userDeviceLinks',
                    where: {
                        userId: userId
                    },
                    attributes: [],
                }
            ]
        },]
    });

    msg.payload = { values: flows };

    return msg;
}

module.exports = {
    getFlows
}