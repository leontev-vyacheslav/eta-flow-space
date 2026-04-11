import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceDataModel, FlowDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel } from '../database/models';
import { SequelizeModule } from '@nestjs/sequelize/dist/sequelize.module';

@Module({
    imports: [SequelizeModule.forFeature([DeviceDataModel, FlowDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel])],
    controllers: [DeviceController],
})
export class DeviceModule {}
