import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { DeviceDataModel, DeviceStateDataModel } from '../../../database/models';
import { SharedStoreService } from '../shared-store/shared-store.service';
import { differenceInMinutes } from 'date-fns';
import { Sequelize } from 'sequelize';

@Injectable()
export class DeviceStateDispatcherService {
    private readonly logger = new Logger(DeviceStateDispatcherService.name);

    constructor(
        private readonly sharedStoreService: SharedStoreService,

        @InjectConnection()
        private readonly sequelize: Sequelize,

        @InjectModel(DeviceDataModel)
        private readonly deviceDataModel: DeviceDataModel,
        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateDataModel: DeviceStateDataModel,
    ) {}

    @Cron('*/1 * * * *')
    async storeDeviceState() {
        const devices = await DeviceDataModel.findAll({
            attributes: ['id', 'updateStateInterval', 'lastStateUpdate'],
        });

        for (const device of devices) {
            const now = new Date();
            const deviceState = await this.sharedStoreService.getDeviceState<Record<string, unknown> & { timestamp: Date }>(device.id);
            // const deviceState = global.get(`deviceState${device.id}`);

            if (!deviceState || Object.keys(deviceState).length === 0 || !deviceState.timestamp) {
                continue;
            }

            // if (differenceInMinutes(now, deviceState.timestamp) > 1) {
            //     Object.keys(deviceState).forEach((key) => {
            //         deviceState[key] = undefined;
            //     });

            //     // global.set(`deviceState${device.id}`, deviceState);
            //     await this.sharedStoreService.setDeviceState(device.id, deviceState, 60);
            //     continue;
            // }

            if (!device.lastStateUpdate || differenceInMinutes(now, device.lastStateUpdate) >= device.updateStateInterval) {
                try {
                    await this.sequelize.transaction(async (t) => {
                        await DeviceStateDataModel.create({ deviceId: device.id, state: deviceState }, { transaction: t });
                        await DeviceDataModel.update({ lastStateUpdate: now }, { where: { id: device.id }, transaction: t });
                    });
                } catch (error) {
                    this.logger.error(`The device state update transaction failed due to the error: ${error}`);
                }
            }
        }

        this.logger.log(`Device state  dispatcher job has been executed`);
    }
}
