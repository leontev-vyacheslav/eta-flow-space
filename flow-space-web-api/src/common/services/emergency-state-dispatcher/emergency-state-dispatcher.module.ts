import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeviceDataModel, DeviceStateDataModel, EmergencyDataModel, EmergencyStateDataModel } from '../../../database/models';
import { ScheduledTaskService } from './emergency-state-dispatcher.service';
import { SharedStoreModule } from '../shared-store/shared-store.module';

@Module({
    imports: [
        SharedStoreModule, // ← add this
        SequelizeModule.forFeature([DeviceDataModel, EmergencyDataModel, DeviceStateDataModel, EmergencyStateDataModel]),
    ],
    providers: [ScheduledTaskService],
})
export class ScheduledTaskModule {}
