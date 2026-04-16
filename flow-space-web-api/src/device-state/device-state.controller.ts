import { Controller, Get, UseGuards, Param, ParseIntPipe, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceStateDataModel } from '../database/models';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { InjectModel } from '@nestjs/sequelize';
import { Op, ProjectionAlias, json } from 'sequelize';
import { Literal } from 'sequelize/lib/utils';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { DeviceStateResponse } from '../models/device-state-response.interface';
import { DeviceStateService } from './device-state.service';

@Controller('api/states/device')
@UseGuards(JwtAuthGuard)
export class DeviceStateController {
    constructor(
        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateModel: typeof DeviceStateDataModel,

        private readonly deviceStateService: DeviceStateService,
    ) {}

    @Get(':deviceId/dates')
    @UseGuards(DeviceOwnershipGuard)
    async getDeviceStatesByDates(
        @Param('deviceId', ParseIntPipe) deviceId: number,
        @Query('beginDate', ParseDatePipe) beginDate: Date,
        @Query('endDate', ParseDatePipe) endDate: Date,
        @Query('fields') fields: string,
    ) {
        const deviceStateFields: ProjectionAlias[] = fields ? fields.split(';').map((f): ProjectionAlias => [json(`state.${f}`) as unknown as Literal, f]) : [];

        const deviceStates = await DeviceStateDataModel.findAll({
            attributes: ['id', 'deviceId', ...deviceStateFields, 'createdAt'],
            where: {
                deviceId: deviceId,
                createdAt: {
                    [Op.between]: [beginDate, endDate],
                },
            },
        });

        return { values: deviceStates };
    }

    @Get(':deviceId')
    @UseGuards(DeviceOwnershipGuard)
    async getDeviceState(@Param('deviceId', ParseIntPipe) deviceId: number): Promise<DeviceStateResponse> {
        return await this.deviceStateService.getDeviceState(deviceId);
    }
}
