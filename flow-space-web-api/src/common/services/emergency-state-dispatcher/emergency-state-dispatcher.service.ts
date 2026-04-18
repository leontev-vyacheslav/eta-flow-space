import { Cron } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { DeviceDataModel, DeviceStateDataModel, EmergencyDataModel, EmergencyStateDataModel } from '../../../database/models';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { SharedStoreService } from '../shared-store/shared-store.service';
import { differenceInMinutes } from 'date-fns';
import { EmergencyReasonModel } from '../../../models/emergency-reason-model';
import { EmergencyStateModel } from '../../../models/emergency-state.model';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class ScheduledTaskService {
    constructor(
        private readonly sharedStoreService: SharedStoreService,

        @InjectConnection()
        private readonly sequelize: Sequelize,

        @InjectModel(DeviceDataModel)
        private readonly deviceDataModel: DeviceDataModel,
        @InjectModel(EmergencyDataModel)
        private readonly emergencyDataModel: EmergencyDataModel,
        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateDataModel: DeviceStateDataModel,
        @InjectModel(EmergencyStateDataModel)
        private readonly emergencyStateDataModel: EmergencyStateDataModel,
    ) {}
    private readonly logger = new Logger(ScheduledTaskService.name);

    @Cron('0 */1 * * * *') // <- every minute
    async storeEmergencyState() {
        const devices = await DeviceDataModel.findAll({
            attributes: ['id'],
            include: [
                {
                    model: EmergencyDataModel,
                    as: 'emergencies',
                    attributes: ['reasons', 'updateStateInterval', 'lastStateUpdate'],
                },
            ],
        });

        const emergencyStates: EmergencyStateModel[] = [];

        for (const device of devices) {
            if (!device.emergencies) {
                // global.set(`emergencyState${device.id}`, undefined);
                await this.sharedStoreService.deleteEmergencyState(device.id);

                continue;
            }

            // let state = global.get(`deviceState${device.id}`);
            let state = await this.sharedStoreService.getDeviceState<Record<string, unknown>>(device.id);
            let stateIsMissing = false;
            const emergencyReasons: EmergencyReasonModel[] = [];

            if (state) {
                const stateKeys = Object.keys(state);
                if (stateKeys.every((k) => state![k] === undefined || state![k] === null) || stateKeys.length === 0) {
                    stateIsMissing = true;
                }
            } else {
                stateIsMissing = true;
            }

            if (stateIsMissing) {
                const deviceState = await DeviceStateDataModel.findOne({
                    where: {
                        deviceId: device.id,
                        [Op.and]: [literal(`state::text <> '{}'`), { state: { [Op.ne]: null } }],
                    },
                    order: [['createdAt', 'DESC']],
                });

                if (deviceState) {
                    state = deviceState.state;
                }

                emergencyReasons.push({
                    id: 100,
                    expression: 'state.isConnected === false',
                    description: 'Связь отсутствует',
                });
            }

            (device.emergencies.reasons as EmergencyReasonModel[]).forEach((emergencyReason) => {
                const result = Boolean(eval(emergencyReason.expression));
                if (result === true) {
                    emergencyReasons.push(emergencyReason);
                }
            });

            const emergencyState =
                emergencyReasons.length === 0
                    ? undefined
                    : {
                          reasons: emergencyReasons,
                          timestamp: Date.now(),
                      };

            await this.sharedStoreService.setEmergencyState(device.id, emergencyState as Record<string, unknown>);
            // global.set(`emergencyState${device.id}`, emergencyState);

            if (emergencyState) {
                if (
                    !device.emergencies.lastStateUpdate ||
                    differenceInMinutes(new Date(), device.emergencies.lastStateUpdate) >= device.emergencies.updateStateInterval
                ) {
                    emergencyStates.push({
                        deviceId: device.id,
                        state: emergencyState as Record<string, unknown>,
                    });
                }
            }
        }

        return; // TODO: keep for a while. remove it after the development

        if (emergencyStates.length > 0) {
            try {
                await this.sequelize.transaction(async (t) => {
                    await EmergencyDataModel.update(
                        { lastStateUpdate: new Date() },
                        {
                            where: {
                                deviceId: { [Op.in]: emergencyStates.map((s) => s.deviceId) },
                            },
                            transaction: t,
                        },
                    );

                    await EmergencyStateDataModel.bulkCreate(emergencyStates as Partial<EmergencyStateDataModel>[], { transaction: t });
                });
            } catch (error) {
                this.logger.error(`The devices emergency states update failed due to the error: ${error}`);
            }
        }
    }
}
