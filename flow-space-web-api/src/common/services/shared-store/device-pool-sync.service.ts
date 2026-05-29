import Redis from 'ioredis';
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DeviceDataModel, FlowDataModel } from '../../../database/models';

@Injectable()
export class DevicePoolSyncService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;
    private readonly logger = new Logger(DevicePoolSyncService.name);

    constructor(
        @InjectModel(DeviceDataModel)
        private readonly deviceDataModel: typeof DeviceDataModel,
        private readonly configService: ConfigService,
    ) {}

    async onModuleInit(): Promise<void> {
        const host = this.configService.get<string>('redis.host');
        const port = this.configService.get<number>('redis.port');
        this.client = new Redis({ host, port });
        await this.syncAll();
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async scheduledSync(): Promise<void> {
        await this.syncAll();
    }

    private async syncAll(): Promise<void> {
        try {
            this.logger.log('Running scheduled devices sync...');

            const devices = await this.deviceDataModel.findAll({
                attributes: ['id', 'code', 'name', 'description', 'updateStateInterval', 'lastStateUpdate', 'settings', 'flowId', 'objectLocationId'],
                include: [
                    {
                        model: FlowDataModel,
                        as: 'flow',
                        attributes: ['uid'],
                    },
                ],
            });

            const freshIds = new Set(devices.map((d) => String(d.id)));
            const existingIds = await this.client.smembers('device:ids');
            const staleIds = existingIds.filter((id) => !freshIds.has(id));

            const pipeline = this.client.pipeline();

            staleIds.forEach((id) => {
                pipeline.del(`device:${id}`);
            });

            pipeline.del('device:ids');
            devices.forEach((device) => {
                pipeline.set(`device:${device.id}`, JSON.stringify(device.toJSON()));
                pipeline.sadd('device:ids', String(device.id));
            });

            await pipeline.exec();
            await this.client.set('device:last-sync', new Date().toISOString());
            this.logger.log(`Sync complete. Synced ${devices.length} devices`);
        } catch (error) {
            this.logger.error('Devices sync failed', error);
        }
    }
}
