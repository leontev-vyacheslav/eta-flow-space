import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { AppConfigModel } from '../../../models/configs/app-config.model';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

interface Dataschema {
    $defs: Record<
        string,
        {
            enumDescriptions: Record<string, string>;
        }
    >;
}

@Injectable()
export class DataSchemasService {
    constructor(
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    get aliases() {
        return {
            ed: this.getEnumDescription.bind(this) as typeof this.getEnumDescription,
            fn: this.formatNumber.bind(this) as typeof this.formatNumber,
        };
    }

    private async getDataschema(deviceCode: string): Promise<Dataschema> {
        const cachedSchema = await this.cacheManager.get<Dataschema>(`schema:${deviceCode}`);
        if (cachedSchema) {
            return cachedSchema;
        }

        const appConfig = this.configService.get<AppConfigModel>('app')!;
        const schemaPath = join(appConfig.staticsPath, `flows/${deviceCode}/${deviceCode}-data-schema.json`);

        let raw: string;
        try {
            raw = await readFile(schemaPath, 'utf-8');
        } catch {
            throw new NotFoundException(`Data schema not found for device: ${deviceCode}`);
        }

        let parsed: Dataschema;
        try {
            parsed = JSON.parse(raw) as Dataschema;
        } catch {
            throw new InternalServerErrorException(`Invalid JSON schema for device: ${deviceCode}`);
        }

        await this.cacheManager.set(`schema:${deviceCode}`, parsed, 60_000);

        return parsed;
    }

    async getEnumDescription(deviceCode: string, typeName: string, value: number): Promise<string> {
        const dataschema = await this.getDataschema(deviceCode);
        const enumDescriptions = dataschema.$defs[typeName]?.enumDescriptions;

        return enumDescriptions?.[value]?.split(' - ').pop() ?? '';
    }

    formatNumber(value: number): string {
        return new Intl.NumberFormat('ru-RU', {
            style: 'decimal',
            maximumFractionDigits: 2,
            minimumFractionDigits: 1,
        }).format(value);
    }
}
