const { promises: fs } = require('fs');
const path = require('path');
const { UserDeviceLinkDataModel, DeviceDataModel } = require('../orm/models');
const { HttpStatusCodes } = require('../constants');

async function getDeviceStateDataschema(msg) {
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

    const dataschemasPath = path.join('/data/static', 'data-schemas');
    const files = await fs.readdir(dataschemasPath);
    const device = await DeviceDataModel.findOne({
        attributes: ['id', 'code'],
        where: {
            id: deviceId,
        },
    });

    const deviceCodeItems = device.code.split('-');
    deviceCodeItems.pop();
    const deviceTypeCode = deviceCodeItems.join('-');

    const dataschemaFileName = files.find((f) => f === `${deviceTypeCode}-state-data-schema.json`);


    if (!dataschemaFileName) {
        msg.statusCode = HttpStatusCodes.NotFound;
        msg.payload = { error: `Схема данных не найдена для устройства с ID ${deviceId}` }

        return msg;
    }


    let dataschemaContent;
    try {
        dataschemaContent = await fs.readFile(path.join(dataschemasPath, dataschemaFileName), 'utf8');
    } catch (error) {
        msg.statusCode = HttpStatusCodes.InternalServerError;
        msg.payload = { error }

        return msg;
    }

    msg.headers = {
        'Content-Type': 'application/json'
    };
    msg.payload = dataschemaContent;

    return msg;
}


module.exports = {
    getDeviceStateDataschema
}