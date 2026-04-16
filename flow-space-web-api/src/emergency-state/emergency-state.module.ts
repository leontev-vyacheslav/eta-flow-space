import { Module } from '@nestjs/common';
import { EmergencyStateController } from './emergency-state.controller';
import { EmergencyStateDataModel, DeviceDataModel, UserDeviceLinkDataModel } from '../database/models';
import { SequelizeModule } from '@nestjs/sequelize/dist/sequelize.module';
import { SharedStoreService } from '../shared-store/shared-store.service';

@Module({
    imports: [SequelizeModule.forFeature([EmergencyStateDataModel, DeviceDataModel, UserDeviceLinkDataModel])],
    controllers: [EmergencyStateController],
    providers: [SharedStoreService],
})
export class EmergencyStateModule {}
