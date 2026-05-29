
async function getDeviceFromCacheAsync(global, flowUid, index = 0) {
    const redisClient = global.get('redisClient');

    const ids = await redisClient.sMembers('device:ids');
    const multi = redisClient.multi();
    ids.forEach(id => multi.get(`device:${id}`));
    const results = await multi.exec();

    const devices = results
        .filter(Boolean)
        .map(d => JSON.parse(d))
        .filter(d => d.flow?.uid === flowUid);

    return devices[index];
}

module.exports = {
    getDeviceFromCacheAsync
}