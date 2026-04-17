import { Controller, Get, UseGuards, Param, ParseIntPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { User } from '../common/decorators/user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { EmergencyStateService } from './emergency-state.service';

@Controller('api/states/emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyStateController {
    constructor(private readonly emergencyStateService: EmergencyStateService) {}

    @Get(':deviceId/dates')
    @UseGuards(DeviceOwnershipGuard)
    async getEmergencyStatesByDates(
        @Param('deviceId', ParseIntPipe) deviceId: number,
        @Query('beginDate', ParseDatePipe) beginDate: Date,
        @Query('endDate', ParseDatePipe) endDate: Date,
    ) {
        const emergencyStates = await this.emergencyStateService.getDeviceStoredStatesByDates(deviceId, beginDate, endDate);

        return { values: emergencyStates };
    }

    @Get('dates')
    async getUserEmergencyStatesByDates(
        @User() user: RequestUser,
        @Query('beginDate', ParseDatePipe) beginDate: Date,
        @Query('endDate', ParseDatePipe) endDate: Date,
    ) {
        const { userId } = user;
        const emergencyStates = await this.emergencyStateService.getUserStoredStatesByDates(userId, beginDate, endDate);

        return { values: emergencyStates };
    }

    @Get()
    async getEmergencyStates(@User() user: RequestUser) {
        const { userId } = user;
        const emergencyStates = await this.emergencyStateService.getCurrentStates(userId);

        return {
            values: emergencyStates,
        };
    }
}
