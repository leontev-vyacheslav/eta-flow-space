import { Module } from '@nestjs/common';
import { SharedStoreService } from './shared-store.service';
import { DevicePoolSyncService } from './device-pool-sync.service';
import { SequelizeModule } from '@nestjs/sequelize/dist/sequelize.module';
import { DeviceDataModel, FlowDataModel } from '../../../database/models';

@Module({
    imports: [SequelizeModule.forFeature([DeviceDataModel, FlowDataModel])],
    providers: [SharedStoreService, DevicePoolSyncService],
    exports: [SharedStoreService],
})
export class SharedStoreModule {}
