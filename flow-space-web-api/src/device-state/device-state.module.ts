import { Module } from '@nestjs/common';
import { DeviceStateController } from './device-state.controller';
import { DeviceStateDataModel } from '../database/models';
import { SequelizeModule } from '@nestjs/sequelize/dist/sequelize.module';

@Module({
    imports: [SequelizeModule.forFeature([DeviceStateDataModel])],
    controllers: [DeviceStateController],
})
export class DeviceStateModule {}
