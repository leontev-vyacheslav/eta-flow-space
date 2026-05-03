import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { configuration } from './config/configuration';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DeviceStateModule } from './device-state/device-state.module';
import { EmergencyStateModule } from './emergency-state/emergency-state.module';
import { FlowModule } from './flow/flow.module';
import { DeviceModule } from './device/device.module';
import { SharedStoreModule } from './common/services/shared-store/shared-store.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmergencyStateDispatcherModule } from './common/services/emergency-state-dispatcher/emergency-state-dispatcher.module';
import { DeviceStateDispatcherModule } from './common/services/device-state-dispatcher/device-state-dispatcher.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ['.env.local', '.env'],
            isGlobal: true,
            load: [configuration],
        }),
        ServeStaticModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => [
                {
                    rootPath: configService.get<string>('STATIC_PATH'),
                    serveRoot: '/static',
                },
            ],
            inject: [ConfigService],
        }),
        ScheduleModule.forRoot(),
        EmergencyStateDispatcherModule,
        DeviceStateDispatcherModule,
        DatabaseModule,
        AuthModule,
        UsersModule,
        SharedStoreModule,
        DeviceStateModule,
        EmergencyStateModule,
        FlowModule,
        DeviceModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
