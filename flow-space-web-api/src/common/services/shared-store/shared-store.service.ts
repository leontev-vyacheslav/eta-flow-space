import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class SharedStoreService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit(): void {
        const host = this.configService.get<string>('redis.host');
        const port = this.configService.get<number>('redis.port');

        this.client = new Redis({ host, port });
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    async getDeviceState<T>(deviceId: number): Promise<T | null> {
        const data = await this.client.get(`deviceState:${deviceId}`);
        if (!data) {
            return null;
        }

        return JSON.parse(data) as T;
    }

    async getEmergencyState<T>(deviceId: number): Promise<T | null> {
        const data = await this.client.get(`emergencyState:${deviceId}`);
        if (!data) {
            return null;
        }

        return JSON.parse(data) as T;
    }

    async deleteDeviceState(deviceId: number): Promise<void> {
        await this.client.del(`deviceState:${deviceId}`);
    }

    async deleteEmergencyState(deviceId: number): Promise<void> {
        await this.client.del(`emergencyState:${deviceId}`);
    }

    async setDeviceState(deviceId: number, state: Record<string, unknown>, ttl: number): Promise<void> {
        await this.client.set(`deviceState:${deviceId}`, JSON.stringify(state), 'EX', ttl);
    }

    async setEmergencyState(deviceId: number, state: Record<string, unknown>, ttl: number): Promise<void> {
        await this.client.set(`emergencyState:${deviceId}`, JSON.stringify(state), 'EX', ttl);
    }

    async saveRefreshToken(token: string, userId: number, ttlSeconds: number): Promise<void> {
        await this.client.set(`refreshToken:${token}`, userId.toString(), 'EX', ttlSeconds);
    }

    async getRefreshTokenUserId(token: string): Promise<number | null> {
        const data = await this.client.get(`refreshToken:${token}`);
        return data ? parseInt(data, 10) : null;
    }

    async deleteRefreshToken(token: string): Promise<void> {
        await this.client.del(`refreshToken:${token}`);
    }
}
