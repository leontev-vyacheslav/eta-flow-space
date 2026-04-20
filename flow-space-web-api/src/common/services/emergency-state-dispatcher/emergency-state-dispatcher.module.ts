import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeviceDataModel, DeviceStateDataModel, EmergencyDataModel, EmergencyStateDataModel } from '../../../database/models';
import { EmergencyStateDispatcherService } from './emergency-state-dispatcher.service';
import { SharedStoreModule } from '../shared-store/shared-store.module';

@Module({
    imports: [
        SharedStoreModule, // ← add this
        SequelizeModule.forFeature([DeviceDataModel, EmergencyDataModel, DeviceStateDataModel, EmergencyStateDataModel]),
    ],
    providers: [EmergencyStateDispatcherService],
})
export class EmergencyStateDispatcherModule {}
