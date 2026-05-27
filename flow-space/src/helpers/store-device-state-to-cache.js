const { getDeviceFromCacheAsync } = require('./get-device-from-cache');

async function storeDeviceStateToCacheAsync(global, flowUid, deviceState, index = 0) {
    const redisClient = global.get('redisClient');

    const device = await getDeviceFromCacheAsync(global, flowUid, index);
    if (device) {
        await redisClient.set(
            `deviceState:${device.id}`,
            JSON.stringify(deviceState),
            { EX: device.settings.stateTtl * 60 }
        );
    }
}

module.exports = {
    storeDeviceStateToCacheAsync
}
