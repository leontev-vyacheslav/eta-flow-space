import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DeviceDataModel } from './models/device.data-model';
import { DeviceStateDataModel } from './models/device-state.data-model';
import { EmergencyDataModel } from './models/emergency.data-model';
import { EmergencyStateDataModel } from './models/emergency-state.data-model';
import { FlowDataModel } from './models/flow.data-model';
import { ObjectLocationDataModel } from './models/object-location.data-model';
import { UserDataModel } from './models/user.data-model';
import { UserDeviceLinkDataModel } from './models/user-device-link.data-model';

const models = [
    DeviceDataModel,
    DeviceStateDataModel,
    EmergencyDataModel,
    EmergencyStateDataModel,
    FlowDataModel,
    ObjectLocationDataModel,
    UserDataModel,
    UserDeviceLinkDataModel,
];

@Global()
@Module({
    imports: [
        SequelizeModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                username: configService.get<string>('database.username'),
                password: configService.get<string>('database.password'),
                database: configService.get<string>('database.database'),
                host: configService.get<string>('database.host'),
                port: configService.get<number>('database.port'),
                dialect: configService.get<'postgres'>('database.dialect'),
                logging: configService.get<boolean | ((sql: string, timing?: number) => void)>('database.logging'),
                models,
                autoLoadModels: true,
                synchronize: true,
            }),
        }),
    ],
})
export class DatabaseModule {}
