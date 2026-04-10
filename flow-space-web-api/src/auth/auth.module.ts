import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { JwtConfig } from '../config/interfaces';

@Module({
    imports: [
        UsersModule,
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const jwtConfig = configService.get('jwt') as JwtConfig;
                return {
                    secret: jwtConfig.secret,
                    signOptions: {
                        expiresIn: jwtConfig.expiresIn as `${number}`,
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
