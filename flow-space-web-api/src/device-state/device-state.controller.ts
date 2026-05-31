import { Controller, Get, UseGuards, Param, ParseIntPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { DeviceStateService } from './device-state.service';
import { DeviceStateDataModel } from '../database/models';
import { ParseFieldsPipe } from '../common/pipes/parse-state-fields.pipe';

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
        @Query('fields', ParseFieldsPipe) fields: string[],
    ): Promise<DeviceStateDataModel[]> {
        return await this.deviceStateService.getDeviceStatesByDates(deviceId, beginDate, endDate, fields);
    }

    @Get(':deviceId')
    @UseGuards(DeviceOwnershipGuard)
    async getDeviceState(@Param('deviceId', ParseIntPipe) deviceId: number): Promise<Partial<DeviceStateDataModel>> {
        return await this.deviceStateService.getDeviceState(deviceId);
    }
}
