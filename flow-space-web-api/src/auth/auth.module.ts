import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserModule } from '../user/user.module';
import { JwtConfigModel } from '../models/configs/jwt-config.model';
import { SharedStoreModule } from '../common/services/shared-store/shared-store.module';
import type { StringValue } from 'ms';

@Module({
    imports: [
        UserModule,
        PassportModule,
        SharedStoreModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const jwtConfig = configService.get('jwt') as JwtConfigModel;
                return {
                    secret: jwtConfig.secret,
                    signOptions: {
                        expiresIn: jwtConfig.expiresIn as StringValue,
                        algorithm: jwtConfig.algorithm as 'HS256',
                    },
                };
            },
        }),
    ],
    providers: [AuthService, JwtStrategy],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule {}
