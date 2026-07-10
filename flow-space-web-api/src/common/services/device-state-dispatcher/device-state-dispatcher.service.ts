import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { DeviceDataModel, DeviceStateDataModel } from '../../../database/models';
import { SharedStoreService } from '../shared-store/shared-store.service';
import { Sequelize, Op } from 'sequelize';

@Injectable()
export class DeviceStateDispatcherService {
    private isRunning = false;
    private readonly logger = new Logger(DeviceStateDispatcherService.name);

    constructor(
        private readonly sharedStoreService: SharedStoreService,

        @InjectConnection()
        private readonly sequelize: Sequelize,

        @InjectModel(DeviceDataModel)
        private readonly deviceDataModel: typeof DeviceDataModel,
        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateDataModel: typeof DeviceStateDataModel,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async storeDeviceState() {
        if (this.isRunning) {
            return;
        }

        const start = Date.now();
        this.isRunning = true;
        try {
            const devices = await this.deviceDataModel.findAll({
                attributes: ['id', 'updateStateInterval', 'lastStateUpdate'],
                where: {
                    lastStateUpdate: {
                        [Op.or]: [
                            {
                                [Op.eq]: null,
                            },
                            {
                                [Op.lt]: Sequelize.literal(`NOW() - "updateStateInterval" * INTERVAL '1 minute'`),
                            },
                        ],
                    },
                },
            });

            const now = new Date();
            let updated = 0,
                failed = 0;
            for (const device of devices) {
                const deviceState = await this.sharedStoreService.getDeviceState<Record<string, unknown> & { timestamp: unknown }>(device.id);

                if (!deviceState || Object.keys(deviceState).length === 0 || !deviceState.timestamp) {
                    continue;
                }

                try {
                    await this.sequelize.transaction(async (t) => {
                        await this.deviceStateDataModel.create({ deviceId: device.id, state: deviceState }, { transaction: t });
                        await this.deviceDataModel.update({ lastStateUpdate: now }, { where: { id: device.id }, transaction: t });
                    });
                    updated++;
                } catch (error) {
                    failed++;
                    this.logger.error('The device state update transaction failed', error);
                }
            }

            this.logger.log(`Device state dispatcher completed: ${updated} updated, ${failed} failed ${`\x1b[33m+${Date.now() - start}ms\x1b[0m`}`);
        } finally {
            this.isRunning = false;
        }
    }
}
