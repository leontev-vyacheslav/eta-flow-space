import { join } from 'path';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { DataSchemasService } from './data-schemas.service';

describe('DataSchemasService', () => {
    // the repository's statics folder, laid out as the container mounts it
    const staticsPath = join(__dirname, '../../../../../flow-space-statics');
    const configService = { get: () => ({ staticsPath }) } as unknown as ConfigService;
    const cache = { get: jest.fn().mockResolvedValue(undefined), set: jest.fn() } as unknown as Cache;
    const service = new DataSchemasService(configService, cache);

    it('reads the enum descriptions from devices/<deviceCode>/data-schema.json', async () => {
        await expect(service.getEnumDescription('tsarevo2-boiler-room', 'BoilerAlarm', 2)).resolves.toBe('Авария (горелка)');
        await expect(service.getEnumDescription('statum-boiler-room', 'NetworkPumpAlarm', 8)).resolves.toBe('Авария ПЧ');
    });

    it('rejects a device without a data schema', async () => {
        await expect(service.getEnumDescription('no-such-device', 'BoilerAlarm', 2)).rejects.toThrow(NotFoundException);
    });
});
