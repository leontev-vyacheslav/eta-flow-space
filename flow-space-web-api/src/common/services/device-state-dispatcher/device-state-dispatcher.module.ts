import { Module } from '@nestjs/common';
import { DeviceStateDispatcherService } from './device-state-dispatcher.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeviceDataModel, DeviceStateDataModel } from '../../../database/models';
import { SharedStoreModule } from '../shared-store/shared-store.module';

@Module({
    imports: [SharedStoreModule, SequelizeModule.forFeature([DeviceDataModel, DeviceStateDataModel])],
    providers: [DeviceStateDispatcherService],
    exports: [],
})
export class DeviceStateDispatcherModule {}
