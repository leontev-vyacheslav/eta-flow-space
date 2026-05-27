import { InjectModel } from '@nestjs/sequelize';
import { DeviceDataModel } from '../../../database/models';
import Redis from 'ioredis/built/Redis';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule/dist/decorators';
import { CronExpression } from '@nestjs/schedule/dist/enums/cron-expression.enum';
import { Injectable } from '@nestjs/common/decorators/core/injectable.decorator';
import { OnModuleDestroy } from '@nestjs/common/interfaces/hooks/on-destroy.interface';
import { OnModuleInit } from '@nestjs/common/interfaces/hooks';
import { Logger } from '@nestjs/common';

@Injectable()
export class DevicePoolSyncService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;
    private readonly logger = new Logger(DevicePoolSyncService.name);

    constructor(
        @InjectModel(DeviceDataModel)
        private readonly deviceDataModel: DeviceDataModel,
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

    private async syncAll(): Promise<void> {
        this.logger.log('Running scheduled devices sync...');

        const devices = await DeviceDataModel.findAll();
        const pipeline = this.client.pipeline();

        devices.forEach((device) => {
            pipeline.set(`device:${device.id}`, JSON.stringify(device));
        });

        await pipeline.exec();
        await this.client.set('device:last-sync', new Date().toISOString());

        this.logger.log(`Devices sync complete. Synced ${devices.length} devices`);
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    private async scheduledSync() {
        await this.syncAll();
    }
}
