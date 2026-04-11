import { Controller, Get, UseGuards, Param, ParseIntPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmergencyStateDataModel, DeviceDataModel } from '../database/models';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { InjectModel } from '@nestjs/sequelize';
import { Op, col } from 'sequelize';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';

@Controller('api/states/emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyStateController {
    constructor(
        @InjectModel(EmergencyStateDataModel)
        private readonly emergencyStateModel: typeof EmergencyStateDataModel,
    ) {}

    @Get('device/:deviceId/dates')
    @UseGuards(DeviceOwnershipGuard)
    async getEmergencyStatesByDates(
        @Param('deviceId', ParseIntPipe) deviceId: number,
        @Query('beginDate', ParseDatePipe) beginDate: Date,
        @Query('endDate', ParseDatePipe) endDate: Date,
    ) {
        const emergencyStates = await EmergencyStateDataModel.findAll({
            attributes: ['id', 'deviceId', [col('device.name'), 'deviceName'], 'state', 'createdAt'],
            include: [
                {
                    model: DeviceDataModel,
                    as: 'device',
                    required: true,
                    attributes: [],
                },
            ],
            where: {
                deviceId: deviceId,
                createdAt: {
                    [Op.between]: [beginDate, endDate],
                },
            },
        });

        return { values: emergencyStates };
    }
}
