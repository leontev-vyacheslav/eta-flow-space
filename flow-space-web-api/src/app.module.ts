import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { configuration } from './config/configuration';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DeviceStateModule } from './device-state/device-state.module';
import { EmergencyStateModule } from './emergency-state/emergency-state.module';
import { FlowModule } from './flow/flow.module';
import { DeviceModule } from './device/device.module';
import { SharedStoreModule } from './shared-store/shared-store.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskScheduledService } from './common/services/task-scheduled.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'static'),
            serveRoot: '/static',
        }),
        ScheduleModule.forRoot(),
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
    providers: [TaskScheduledService],
})
export class AppModule {}
