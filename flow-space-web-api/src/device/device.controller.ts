import { Controller, Get, UseGuards, Param, ParseIntPipe, Header, InternalServerErrorException, NotFoundException, StreamableFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { DeviceDataModel, FlowDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel } from '../database/models';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { User } from '../common/decorators/user.decorator';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions } from 'sequelize';
import { createReadStream, promises as fs } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

@Controller('api/devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
    constructor(
        @InjectModel(DeviceDataModel)
        private readonly deviceModel: typeof DeviceDataModel,
        @InjectModel(UserDeviceLinkDataModel)
        private readonly userDeviceLinkModel: typeof UserDeviceLinkDataModel,
        @InjectModel(FlowDataModel)
        private readonly flowModel: typeof FlowDataModel,
        private readonly configService: ConfigService,
    ) {}

    @Get()
    async getDevices(@User() user: RequestUser) {
        const devices = await this.deviceModel.findAll({
            include: [
                {
                    model: FlowDataModel,
                    as: 'flow',
                },
                {
                    model: ObjectLocationDataModel,
                    as: 'objectLocation',
                },
                {
                    model: UserDeviceLinkDataModel,
                    as: 'userDeviceLinks',
                    where: {
                        userId: user.userId,
                    },
                    attributes: [],
                },
            ],
        } as FindOptions);

        return { values: devices };
    }

    @Get(':deviceId')
    @UseGuards(DeviceOwnershipGuard)
    async getDevice(@Param('deviceId', ParseIntPipe) deviceId: number) {
        const device = await this.deviceModel.findOne({
            include: [
                {
                    model: ObjectLocationDataModel,
                    as: 'objectLocation',
                },
                {
                    model: FlowDataModel,
                    as: 'flow',
                },
            ],
            where: {
                id: deviceId,
            },
        } as FindOptions);

        return { values: device };
    }

    @Get(':deviceId/mnemoschema')
    @UseGuards(DeviceOwnershipGuard)
    @Header('Content-Type', 'image/svg+xml')
    async getDeviceMnemoschema(@Param('deviceId', ParseIntPipe) deviceId: number) {
        const device = await this.deviceModel.findOne({
            attributes: ['id'],
            include: [
                {
                    model: FlowDataModel,
                    as: 'flow',
                    attributes: ['code'],
                },
            ],
            where: {
                id: deviceId,
            },
        } as FindOptions);

        const flowCode = device!.flow!.code;
        const staticPath = this.configService.get<string>('app.staticPath') ?? join(process.cwd(), 'static');
        const filePath = join(staticPath, 'flows', flowCode, `${flowCode}-mnemo-schema.svg`);

        try {
            await fs.access(filePath);
        } catch {
            throw new NotFoundException(`Файл мнемосхемы для потока ${flowCode} не найден.`);
        }

        try {
            const stream = createReadStream(filePath, { encoding: 'utf8' });
            return new StreamableFile(stream);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера.';
            throw new InternalServerErrorException(message);
        }
    }

    @Get(':deviceId/data-schema')
    @UseGuards(DeviceOwnershipGuard)
    @Header('Content-Type', 'application/json')
    async getDeviceStateDataSchema(@Param('deviceId', ParseIntPipe) deviceId: number) {
        const device = await this.deviceModel.findOne({
            attributes: ['id', 'code'],
            include: [
                {
                    model: FlowDataModel,
                    as: 'flow',
                    attributes: ['code'],
                },
            ],
            where: {
                id: deviceId,
            },
        } as FindOptions);

        if (!device) {
            throw new NotFoundException(`Устройство с ID ${deviceId} не найдено.`);
        }

        const flowCode = device.flow!.code;
        const staticPath = this.configService.get<string>('app.staticPath') ?? join(process.cwd(), 'static');
        const flowStaticPath = join(staticPath, 'flows', flowCode);

        // Extract device type code by removing the last part after the last dash
        const deviceCodeParts = device.code.split('-');
        deviceCodeParts.pop();
        const deviceTypeCode = deviceCodeParts.join('-');
        const schemaFileName = `${deviceTypeCode}-data-schema.json`;

        const filePath = join(flowStaticPath, schemaFileName);

        try {
            await fs.access(filePath);
        } catch {
            throw new NotFoundException(`Схема данных не найдена для устройства с ID ${deviceId}`);
        }

        try {
            const stream = createReadStream(filePath, { encoding: 'utf8' });

            return new StreamableFile(stream);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера.';
            throw new InternalServerErrorException(message);
        }
    }
}
