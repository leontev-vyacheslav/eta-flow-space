import { Module } from '@nestjs/common';
import { EmergencyStateController } from './emergency-state.controller';
import { EmergencyStateDataModel, DeviceDataModel, UserDeviceLinkDataModel } from '../database/models';
import { SequelizeModule } from '@nestjs/sequelize/dist/sequelize.module';

@Module({
    imports: [SequelizeModule.forFeature([EmergencyStateDataModel, DeviceDataModel, UserDeviceLinkDataModel])],
    controllers: [EmergencyStateController],
})
export class EmergencyStateModule {}
