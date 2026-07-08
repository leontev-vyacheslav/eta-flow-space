import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class SharedStoreService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;
    private readonly logger = new Logger(SharedStoreService.name);

    constructor(private readonly configService: ConfigService) {}

    onModuleInit(): void {
        const host = this.configService.get<string>('redis.host');
        const port = this.configService.get<number>('redis.port');

        this.client = new Redis({ host, port });

        this.client.on('error', (err) => {
            this.logger.error('Redis connection error', err);
        });
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.client.quit();
        } catch (error) {
            this.logger.error('Failed to close Redis connection', error);
        }
    }

    async getDeviceState<T>(deviceId: number): Promise<T | null> {
        try {
            const data = await this.client.get(`deviceState:${deviceId}`);
            if (!data) {
                return null;
            }
            return JSON.parse(data) as T;
        } catch (error) {
            this.logger.error(`Failed to get device state for device ${deviceId}`, error);
            return null;
        }
    }

    async getEmergencyState<T>(deviceId: number): Promise<T | null> {
        try {
            const data = await this.client.get(`emergencyState:${deviceId}`);
            if (!data) {
                return null;
            }
            return JSON.parse(data) as T;
        } catch (error) {
            this.logger.error(`Failed to get emergency state for device ${deviceId}`, error);
            return null;
        }
    }

    async deleteDeviceState(deviceId: number): Promise<void> {
        try {
            await this.client.del(`deviceState:${deviceId}`);
        } catch (error) {
            this.logger.error(`Failed to delete device state for device ${deviceId}`, error);
        }
    }

    async deleteEmergencyState(deviceId: number): Promise<void> {
        try {
            await this.client.del(`emergencyState:${deviceId}`);
        } catch (error) {
            this.logger.error(`Failed to delete emergency state for device ${deviceId}`, error);
        }
    }

    async setDeviceState(deviceId: number, state: Record<string, unknown>, ttl: number): Promise<void> {
        try {
            await this.client.set(`deviceState:${deviceId}`, JSON.stringify(state), 'EX', ttl);
        } catch (error) {
            this.logger.error(`Failed to set device state for device ${deviceId}`, error);
        }
    }

    async setEmergencyState(deviceId: number, state: Record<string, unknown>, ttl: number): Promise<void> {
        try {
            await this.client.set(`emergencyState:${deviceId}`, JSON.stringify(state), 'EX', ttl);
        } catch (error) {
            this.logger.error(`Failed to set emergency state for device ${deviceId}`, error);
        }
    }

    async saveRefreshToken(token: string, userId: number, ttlSeconds: number): Promise<void> {
        try {
            await this.client.set(`refreshToken:${token}`, userId.toString(), 'EX', ttlSeconds);
        } catch (error) {
            this.logger.error(`Failed to save refresh token for user ${userId}`, error);
        }
    }

    async getRefreshTokenUserId(token: string): Promise<number | null> {
        try {
            const data = await this.client.get(`refreshToken:${token}`);
            if (!data) {
                return null;
            }
            const userId = parseInt(data, 10);
            return isNaN(userId) ? null : userId;
        } catch (error) {
            this.logger.error('Failed to get refresh token user id', error);
            return null;
        }
    }

    async deleteRefreshToken(token: string): Promise<void> {
        try {
            await this.client.del(`refreshToken:${token}`);
        } catch (error) {
            this.logger.error('Failed to delete refresh token', error);
        }
    }
}
