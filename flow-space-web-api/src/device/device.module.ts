import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DeviceController } from './device.controller';
import { DeviceDataModel, FlowDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel, ReportDataModel } from '../database/models';
import { SequelizeModule } from '@nestjs/sequelize/dist/sequelize.module';

@Module({
    imports: [ConfigModule, SequelizeModule.forFeature([DeviceDataModel, FlowDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel, ReportDataModel])],
    controllers: [DeviceController],
})
export class DeviceModule {}
