import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DeviceDataModel, DeviceStateDataModel, EmergencyDataModel, EmergencyStateDataModel, FlowDataModel } from '../../../database/models';
import { EmergencyStateDispatcherService } from './emergency-state-dispatcher.service';
import { SharedStoreModule } from '../shared-store/shared-store.module';
import { DataSchemasModule } from '../data-schemas/data-schemas.module';

@Module({
    imports: [
        DataSchemasModule,
        SharedStoreModule,
        SequelizeModule.forFeature([DeviceDataModel, EmergencyDataModel, DeviceStateDataModel, EmergencyStateDataModel, FlowDataModel]),
    ],
    providers: [EmergencyStateDispatcherService],
})
export class EmergencyStateDispatcherModule {}
