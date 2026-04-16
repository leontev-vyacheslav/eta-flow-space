import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class SharedStoreService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit(): void {
        const host = this.configService.get<string>('redis.host') ?? 'localhost';
        const port = this.configService.get<number>('redis.port') ?? 6379;

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
}
