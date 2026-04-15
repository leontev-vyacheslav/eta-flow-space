import { Controller, Get, UseGuards, Param, ParseIntPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmergencyStateDataModel, DeviceDataModel, UserDeviceLinkDataModel } from '../database/models';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { InjectModel } from '@nestjs/sequelize';
import { Op, col } from 'sequelize';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { User } from '../common/decorators/user.decorator';
import { RequestUser } from '../common/interfaces/request-user.interface';

@Controller('api/states/emergency')
@UseGuards(JwtAuthGuard)
export class EmergencyStateController {
    constructor(
        @InjectModel(EmergencyStateDataModel)
        private readonly emergencyStateModel: typeof EmergencyStateDataModel,
        @InjectModel(UserDeviceLinkDataModel)
        private readonly userDeviceLinkModel: typeof UserDeviceLinkDataModel,
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

    @Get('dates')
    async getUserEmergencyStatesByDates(
        @User() user: RequestUser,
        @Query('beginDate', ParseDatePipe) beginDate: Date,
        @Query('endDate', ParseDatePipe) endDate: Date,
    ) {
        const { userId } = user;

        const states = await EmergencyStateDataModel.findAll({
            attributes: ['id', 'deviceId', [col('device.name'), 'deviceName'], 'state', 'createdAt'],
            include: [
                {
                    model: DeviceDataModel,
                    as: 'device',
                    required: true,
                    attributes: [],
                    include: [
                        {
                            model: UserDeviceLinkDataModel,
                            as: 'userDeviceLinks',
                            required: true,
                            attributes: [],
                            where: {
                                userId: userId,
                            },
                        },
                    ],
                },
            ],
            where: {
                createdAt: {
                    [Op.between]: [beginDate, endDate],
                },
            },
        });

        return { values: states };
    }
}
