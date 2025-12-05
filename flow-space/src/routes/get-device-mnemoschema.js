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

    const mnemoschemasPath = path.join('/data/static', 'mnemoschemas');
    const files = await fs.readdir(mnemoschemasPath);
    const device = await DeviceDataModel.findOne({
        attributes: ["id"],
        where: {
            id: deviceId,
        },
        include: [{
            model: FlowDataModel,
            as: 'flow',
            attributes: ["uid"],
        }],
    });


    const mnemoschemaPathInfo = files.map(file => {
        const fileNameWithoutExt = path.basename(file, path.extname(file));
        const flowUid = fileNameWithoutExt.split('-').pop();

        return {
            file,
            flowUid
        };
    }).find(f => f.flowUid === device.flow.uid);

    if (!mnemoschemaPathInfo) {
        msg.statusCode = HttpStatusCodes.NotFound;
        msg.payload = { error: `Мнемосхема не найдена для устройства с ID ${deviceId}` }

        return msg;
    }

    console.log(mnemoschemaPathInfo);

    let mnemoschemaSvgContent;
    try {
        mnemoschemaSvgContent = await fs.readFile(path.join(mnemoschemasPath, mnemoschemaPathInfo.file), 'utf8');
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