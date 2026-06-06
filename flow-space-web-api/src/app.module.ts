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
import KeyvRedis from '@keyv/redis';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as path from 'path';
import { UserCacheInterceptor } from './common/interceptors/user-cache.interceptor';

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
                watch: true, // auto-reload on file change (dev only)
            },
            resolvers: [
                // Priority order — first match wins:
                { use: QueryResolver, options: ['lang'] },
                AcceptLanguageResolver,
                new HeaderResolver(['x-lang']),
            ],
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
    providers: [{ provide: APP_INTERCEPTOR, useClass: UserCacheInterceptor }],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*');
    }
}
