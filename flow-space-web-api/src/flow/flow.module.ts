import { Module } from '@nestjs/common';
import { FlowController } from './flow.controller';
import { FlowDataModel, DeviceDataModel, UserDeviceLinkDataModel } from '../database/models';
import { SequelizeModule } from '@nestjs/sequelize/dist/sequelize.module';

@Module({
    imports: [SequelizeModule.forFeature([FlowDataModel, DeviceDataModel, UserDeviceLinkDataModel])],
    controllers: [FlowController],
})
export class FlowModule {}
