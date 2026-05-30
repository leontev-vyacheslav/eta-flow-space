import { Controller, Get, UseGuards, Param, ParseIntPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { DeviceStateResponseModel } from '../models/device-state-response.model';
import { DeviceStateService } from './device-state.service';

@Controller('api/device-states')
@UseGuards(JwtAuthGuard)
export class DeviceStateController {
    constructor(private readonly deviceStateService: DeviceStateService) {}

    @Get(':deviceId/dates')
    @UseGuards(DeviceOwnershipGuard)
    async getDeviceStatesByDates(
        @Param('deviceId', ParseIntPipe) deviceId: number,
        @Query('beginDate', ParseDatePipe) beginDate: Date,
        @Query('endDate', ParseDatePipe) endDate: Date,
        @Query('fields') fields: string,
    ) {
        return await this.deviceStateService.getDeviceStatesByDates(deviceId, beginDate, endDate, fields);
    }

    @Get(':deviceId')
    @UseGuards(DeviceOwnershipGuard)
    async getDeviceState(@Param('deviceId', ParseIntPipe) deviceId: number): Promise<DeviceStateResponseModel> {
        return await this.deviceStateService.getDeviceState(deviceId);
    }
}
