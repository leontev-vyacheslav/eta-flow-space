const { promises: fs } = require('fs');
const path = require('path');
const { UserDeviceLinkDataModel, DeviceDataModel, FlowDataModel } = require('../orm/models');
const { HttpStatusCodes } = require('../constants');

async function getDeviceMnemoschema(msg) {
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

    const device = await DeviceDataModel.findOne({
        attributes: ["id"],
        where: {
            id: deviceId,
        },
        include: [{
            model: FlowDataModel,
            as: 'flow',
            attributes: ["code"],
        }],
    });

    const flowStaticPath = path.join('/data/static/flows', device.flow.code);
    const files = await fs.readdir(flowStaticPath);
    const mnemoschemaFileName = files.find((f) => f === `${device.flow.code}-mnemo-schema.svg`);

    let mnemoschemaSvgContent;
    try {
        mnemoschemaSvgContent = await fs.readFile(path.join(flowStaticPath, mnemoschemaFileName), 'utf8');
    } catch (error) {
        msg.statusCode = HttpStatusCodes.InternalServerError;
        msg.payload = { error }

        return msg;
    }

    msg.headers = {
        'Content-Type': 'image/svg+xml'
    };
    msg.payload = mnemoschemaSvgContent;

    return msg;
}


module.exports = {
    getDeviceMnemoschema
}