import { Module, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configuration } from './config/configuration';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DeviceStateModule } from './device-state/device-state.module';
import { EmergencyStateModule } from './emergency-state/emergency-state.module';
import { FlowModule } from './flow/flow.module';
import { DeviceModule } from './device/device.module';
import { SharedStoreModule } from './common/services/shared-store/shared-store.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmergencyStateDispatcherModule } from './common/services/emergency-state-dispatcher/emergency-state-dispatcher.module';
import { DeviceStateDispatcherModule } from './common/services/device-state-dispatcher/device-state-dispatcher.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';

import KeyvRedis from '@keyv/redis';
import * as path from 'path';
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
            load: [configuration],
        }),
        I18nModule.forRoot({
            fallbackLanguage: 'en',
            loaderOptions: {
                path: path.join(__dirname, '/i18n/'),
                watch: process.env.NODE_ENV !== 'production',
            },
            resolvers: [
                // Priority order — first match wins:
                { use: QueryResolver, options: ['lang'] },
                AcceptLanguageResolver,
                new HeaderResolver(['x-lang']),
            ],
        }),
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    ttl: seconds(parseInt(process.env.THROTTLE_TTL || '60')),
                    limit: parseInt(process.env.THROTTLE_LIMIT || '20'),
                },
            ],
            errorMessage: 'Слишком много запросов. Пожалуйста, попробуйте позже.',
        }),
        CacheModule.registerAsync({
            isGlobal: true,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const host = config.getOrThrow<string>('REDIS_HOST');
                const port = config.getOrThrow<number>('REDIS_PORT');

                return {
                    stores: [new KeyvRedis(`redis://${host}:${port}`)],
                    ttl: 30_000,
                };
            },
        }),
        ScheduleModule.forRoot(),
        EmergencyStateDispatcherModule,
        DeviceStateDispatcherModule,
        DatabaseModule,
        AuthModule,
        UserModule,
        SharedStoreModule,
        DeviceStateModule,
        EmergencyStateModule,
        FlowModule,
        DeviceModule,
    ],
    controllers: [AppController],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*');
    }
}
