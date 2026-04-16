// src/device-state/device-state.module.ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeviceStateController } from './device-state.controller';
import { DeviceStateService } from './device-state.service';
import { DeviceStateDataModel } from '../database/models/device-state.data-model';
import { SharedStoreModule } from '../shared-store/shared-store.module';

@Module({
    imports: [SequelizeModule.forFeature([DeviceStateDataModel]), SharedStoreModule],
    controllers: [DeviceStateController],
    providers: [DeviceStateService],
})
export class DeviceStateModule {}
