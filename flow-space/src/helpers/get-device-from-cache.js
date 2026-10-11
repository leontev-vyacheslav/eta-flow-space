// Devices are cached in Redis by the web API (DevicePoolSyncService): device:ids (a set of ids) and
// device:<id> (the device row with flow.uid), refreshed every 5 minutes.
async function getCachedDevicesAsync(global) {
    const redisClient = global.get('redisClient');

    const ids = await redisClient.sMembers('device:ids');
    const multi = redisClient.multi();
    ids.forEach(id => multi.get(`device:${id}`));
    const results = await multi.exec();

    return results
        .filter(Boolean)
        .map(d => JSON.parse(d));
}

// The device with this code (device.code is unique), or undefined.
async function getDeviceFromCacheAsync(global, deviceCode) {
    const devices = await getCachedDevicesAsync(global);
    return devices.find(d => d.code === deviceCode);
}

// Legacy lookup by position among the flow's devices sorted by id. Kept only
// so that calls in an older flows.json keep working; use the device code.
async function getDeviceByFlowIndexAsync(global, flowUid, index = 0) {
    const devices = await getCachedDevicesAsync(global);
    return devices
        .filter(d => d.flow?.uid === flowUid)
        .sort((a, b) => a.id - b.id)[index];
}

module.exports = {
    getCachedDevicesAsync,
    getDeviceFromCacheAsync,
    getDeviceByFlowIndexAsync,
}
