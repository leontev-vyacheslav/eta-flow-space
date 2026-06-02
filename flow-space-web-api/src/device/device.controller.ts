import { Controller, Get, UseGuards, Param, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { RequestUserModel } from '../models/request-user.model';
import { User } from '../common/decorators/user.decorator';
import { DeviceService } from './device.service';
import { DeviceDataModel } from '../database/models';
import { I18nService } from 'nestjs-i18n';

@Controller('api/devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly i18n: I18nService,
    ) {}

    @Get()
    async getDevices(@User() user: RequestUserModel): Promise<DeviceDataModel[]> {
        const devices = await this.deviceService.getDevices(user.userId);

        return devices;
    }

    @Get(':deviceId')
    @UseGuards(DeviceOwnershipGuard)
    async getDevice(@Param('deviceId', ParseIntPipe) deviceId: number): Promise<DeviceDataModel> {
        const device = await this.deviceService.getDevice(deviceId);
        if (!device) {
            throw new NotFoundException(this.i18n.t('errors.DEVICE_NOT_FOUND', { args: { deviceId } }));
        }

        return device;
    }
}
