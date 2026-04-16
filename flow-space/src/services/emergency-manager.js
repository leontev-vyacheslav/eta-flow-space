const { differenceInMinutes } = require('date-fns');
const { Op, literal } = require('sequelize');
const { DeviceDataModel, EmergencyDataModel, DeviceStateDataModel, EmergencyStateDataModel, sequelize, UserDeviceLinkDataModel, UserDataModel } = require('../orm/models');

async function storeEmergencyStates(msg, global) {
    const devices = await DeviceDataModel.findAll({
        attributes: ['id'],
        include: [{
            model: EmergencyDataModel,
            as: 'emergencies',
            attributes: ["reasons", 'updateStateInterval', 'lastStateUpdate'],
        }]
    });

    const emergencyStates = [];
    for (const device of devices) {
        if (!device.emergencies) {
            global.set(`emergencyState${device.id}`, undefined);

            continue;
        }

        let state = global.get(`deviceState${device.id}`);
        let stateIsMissing = false;
        const emergencyReasons = [];

        if (state) {
            const stateKeys = Object.keys(state);
            if (stateKeys.every(k => state[k] === undefined || state[k] === null) || stateKeys.length === 0) {
                stateIsMissing = true;
            }
        } else {
            stateIsMissing = true;
        }

        if (stateIsMissing) {
            const deviceState = await DeviceStateDataModel.findOne({
                where: {
                    deviceId: device.id,
                    [Op.and]: [
                        literal(`state::text <> '{}'`),
                        { state: { [Op.ne]: null } }
                    ]
                },
                order: [['createdAt', 'DESC']]
            });

            if (deviceState) {
                state = deviceState.state;
            }

            emergencyReasons.push({
                id: 100,
                expression: "state.isConnected === false",
                description: "Связь отсутствует"
            })
        }

        device.emergencies.reasons.forEach(emergencyReason => {
            const result = eval(emergencyReason.expression);
            if (result === true) {
                emergencyReasons.push(emergencyReason);
            }
        });

        const emergencyState = emergencyReasons.length === 0
            ? undefined
            : {
                reasons: emergencyReasons,
                timestamp: Date.now(),
            };

        global.set(`emergencyState${device.id}`, emergencyState);

        const redisClient = global.get('redisClient');
        await redisClient.set(
            `emergencyState:${device.id}`,
            JSON.stringify(emergencyState),
            { EX: 120 }
        );

        if (emergencyState) {
            if (!device.emergencies.lastStateUpdate || differenceInMinutes(new Date(), device.emergencies.lastStateUpdate) >= device.emergencies.updateStateInterval) {
                emergencyStates.push({
                    deviceId: device.id,
                    state: emergencyState
                });
            }
        }
    }
    if (emergencyStates.length > 0) {
        try {
            await sequelize.transaction(async t => {
                await EmergencyDataModel.update(
                    { lastStateUpdate: new Date() },
                    {
                        where: {
                            deviceId: { [Op.in]: emergencyStates.map(s => s.deviceId) }
                        },
                        transaction: t
                    }
                );

                await EmergencyStateDataModel.bulkCreate(emergencyStates, { transaction: t });
            });
        } catch (error) {
            console.error(`The devices emergency states update failed due to the error: ${error}`);
        }
/*
        const targetUsers = await UserDataModel.findAll({
            attributes: ['id', 'name', 'settings'],
            include: [{
                model: UserDeviceLinkDataModel,
                as: 'userDeviceLinks',
                attributes: ['deviceId'],
                required: true,
                where: {
                    deviceId: { [Op.in]: emergencyStates.map(s => s.deviceId) }
                }
            }],
            where: {
                [Op.and]: [
                    { settings: { [Op.not]: null } },
                    literal(`settings #>> '{notifications,ntfy,topicUid}' IS NOT NULL`),
                    literal(`settings #>> '{notifications,ntfy,topicUid}' != ''`)
                ]
            }
        });
        console.log(targetUsers);

        const notificationPromises = [];

        for (const user of targetUsers) {
            const topicUid = user.settings.notifications.ntfy.topicUid;
            const topic = `${user.name}-${topicUid}`;
            const userEmergencyStates = user.userDeviceLinks
                .map(link => emergencyStates.find(s => s.deviceId === link.deviceId))
                .filter(Boolean);

            for (const userEmergencyState of userEmergencyStates) {
                const message = `Аварийное состояние устройства [${userEmergencyState.deviceId}]:\n${userEmergencyState.state.reasons.map(r => r.description).join('\n')}.`;
                const notificationPromise = fetch(`https://ntfy.sh/${topic}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.NTFY_TOKEN}`,
                        'Title': `⚠️ ETA Flow Space`,
                        'Priority': 'high',
                        'Tags': 'warning,rotating_light',
                        'Content-Type': 'text/plain',
                    },
                    body: message
                });

                notificationPromises.push(notificationPromise);
            }
        }

        const results = await Promise.allSettled(notificationPromises);
*/
    }

    return msg;
}

module.exports = {
    storeEmergencyStates
}