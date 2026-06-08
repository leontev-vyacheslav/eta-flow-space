import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { DeviceDataModel, DeviceStateDataModel, EmergencyDataModel, EmergencyStateDataModel } from '../../../database/models';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { SharedStoreService } from '../shared-store/shared-store.service';
import { differenceInMinutes } from 'date-fns';
import { Sequelize } from 'sequelize-typescript';
import { EmergencyReasonModel, EmergencyStateModel } from '../../../models';
import { DataSchemasService } from '../data-schemas/data-schemas.service';

@Injectable()
export class EmergencyStateDispatcherService {
    private isRunning = false;
    private readonly logger = new Logger(EmergencyStateDispatcherService.name);

    constructor(
        private readonly dataSchemasService: DataSchemasService,
        private readonly sharedStoreService: SharedStoreService,

        @InjectConnection()
        private readonly sequelize: Sequelize,

        @InjectModel(DeviceDataModel)
        private readonly deviceDataModel: typeof DeviceDataModel,

        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateDataModel: typeof DeviceStateDataModel,

        @InjectModel(EmergencyDataModel)
        private readonly emergencyDataModel: typeof EmergencyDataModel,

        @InjectModel(EmergencyStateDataModel)
        private readonly emergencyStateDataModel: typeof EmergencyStateDataModel,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async storeEmergencyState() {
        if (this.isRunning) {
            return;
        }

        const start = Date.now();
        this.isRunning = true;
        try {
            const devices = await this.deviceDataModel.findAll({
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
                    await this.sharedStoreService.deleteEmergencyState(device.id);

                    continue;
                }

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
                    const deviceState = await this.deviceStateDataModel.findOne({
                        where: {
                            deviceId: device.id,
                            [Op.and]: [literal(`state::text <> '{}'`), { state: { [Op.ne]: null } }],
                        },
                        order: [['createdAt', 'DESC']],
                    });

                    if (deviceState) {
                        state = deviceState.state;
                    }

                    if (!state) {
                        state = {
                            isConnected: false,
                            timestamp: new Date(),
                        };
                    } else {
                        state.isConnected = false;
                        state.timestamp = new Date();
                    }

                    emergencyReasons.push({
                        id: 100,
                        expression: 'state.isConnected === false',
                        description: 'Связь отсутствует',
                    });
                }

                /* eslint-disable @typescript-eslint/no-unused-vars */
                const ds = this.dataSchemasService.aliases;
                const dc = device.code;
                /* eslint-enable @typescript-eslint/no-unused-vars */

                for (const emergencyReason of device.emergencies.reasons as EmergencyReasonModel[]) {
                    try {
                        const result = Boolean(await eval(emergencyReason.expression));
                        if (result) {
                            if (emergencyReason.description.includes('`')) {
                                emergencyReason.description = (await eval(emergencyReason.description)) as string;
                            }
                            emergencyReasons.push(emergencyReason);
                        }
                    } catch (error) {
                        this.logger.error(`Failed to evaluate expression for reason ${emergencyReason.id}: ${error}`);
                    }
                }

                const emergencyState =
                    emergencyReasons.length === 0
                        ? undefined
                        : {
                              reasons: emergencyReasons,
                              timestamp: Date.now(),
                          };

                await this.sharedStoreService.setEmergencyState(device.id, emergencyState as Record<string, unknown>, 120);

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

            if (emergencyStates.length > 0) {
                try {
                    await this.sequelize.transaction(async (t) => {
                        await this.emergencyDataModel.update(
                            { lastStateUpdate: new Date() },
                            {
                                where: {
                                    deviceId: { [Op.in]: emergencyStates.map((s) => s.deviceId) },
                                },
                                transaction: t,
                            },
                        );

                        await this.emergencyStateDataModel.bulkCreate(emergencyStates as Partial<EmergencyStateDataModel>[], { transaction: t });
                    });
                } catch (error) {
                    this.logger.error(`The devices emergency states update failed due to the error: ${error}`);
                }
            }

            this.logger.log(`Emergency state dispatcher completed: ${emergencyStates.length} states stored ${`\x1b[33m+${Date.now() - start}ms\x1b[0m`}`);
        } finally {
            this.isRunning = false;
        }
    }
}
