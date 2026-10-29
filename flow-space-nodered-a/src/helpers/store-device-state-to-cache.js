const { getCachedDevicesAsync, getDeviceByFlowIndexAsync } = require('./get-device-from-cache');

/**
 * Stores a device state in Redis (deviceState:<id>, expiring after the device's stateTtl minutes).
 *
 * The device is found by its code — the same code the diagrams and data schemas use — so the state
 * can never land on another device of the flow:
 *
 *     const DEVICE_CODE = 'spring2-irvis-29804';
 *     const flowUid = node.path.split('/').find(_ => true);
 *     await storeDeviceStateToCacheAsync(global, DEVICE_CODE, deviceState, flowUid);
 *
 * Throws when the code is not in the device cache, or when flowUid is given and the device belongs to
 * another flow (tab), so a wrong code shows up as a Node-RED error instead of silently storing nothing
 * or storing under another device.
 *
 * The legacy call (global, flowUid, deviceState, index) — position among the flow's devices — still
 * works, with a warning, until every flows.json uses device codes.
 */
async function storeDeviceStateToCacheAsync(global, deviceCode, deviceState, flowUid) {
    const redisClient = global.get('redisClient');
    const devices = await getCachedDevicesAsync(global);

    let device = devices.find(d => d.code === deviceCode);
    if (!device && devices.some(d => d.flow?.uid === deviceCode) && (flowUid === undefined || typeof flowUid === 'number')) {
        console.warn(`storeDeviceStateToCacheAsync: legacy call by flow index (${deviceCode}, ${flowUid ?? 0}); use the device code`);
        device = await getDeviceByFlowIndexAsync(global, deviceCode, flowUid ?? 0);
        if (!device) return;
    } else {
        if (!device) {
            throw new Error(`storeDeviceStateToCacheAsync: device "${deviceCode}" is not in the device cache`);
        }
        if (flowUid !== undefined && device.flow?.uid !== flowUid) {
            throw new Error(`storeDeviceStateToCacheAsync: device "${deviceCode}" belongs to flow ${device.flow?.uid}, not ${flowUid}`);
        }
    }

    await redisClient.set(
        `deviceState:${device.id}`,
        JSON.stringify(deviceState),
        { EX: device.settings.stateTtl * 60 }
    );
}

module.exports = {
    storeDeviceStateToCacheAsync
}
