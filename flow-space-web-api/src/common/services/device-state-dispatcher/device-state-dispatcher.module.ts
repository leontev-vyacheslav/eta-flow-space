import { Module } from '@nestjs/common';
import { DeviceStateDispatcherService } from './device-state-dispatcher.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeviceDataModel, DeviceStateDataModel } from '../../../database/models';

@Module({
    imports: [SequelizeModule.forFeature([DeviceDataModel, DeviceStateDataModel])],
    providers: [DeviceStateDispatcherService],
    exports: [DeviceStateDispatcherService],
})
export class DeviceStateDispatcherModule {}
