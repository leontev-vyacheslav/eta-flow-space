import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DeviceStateModule } from './device-state/device-state.module';
import { EmergencyStateModule } from './emergency-state/emergency-state.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        DatabaseModule,
        AuthModule,
        UsersModule,
        DeviceStateModule,
        EmergencyStateModule,
    ],
    controllers: [AppController],
    providers: [],
})
export class AppModule {}
