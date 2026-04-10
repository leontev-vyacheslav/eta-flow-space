import { Controller, Get, UseGuards, Param, ParseIntPipe, ForbiddenException, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceStateDataModel, UserDeviceLinkDataModel } from '../database/models';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { User } from '../common/decorators/user.decorator';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { InjectModel } from '@nestjs/sequelize';
import { Op, ProjectionAlias, json } from 'sequelize';
import { Literal } from 'sequelize/lib/utils';

@Controller('api/states/device')
export class DeviceStateController {
    constructor(
        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateModel: typeof DeviceStateDataModel,
    ) {}

    @Get(':deviceId/dates')
    @UseGuards(JwtAuthGuard)
    async getDeviceStatesByDates(
        @Param('deviceId', ParseIntPipe) deviceId: number,
        @Query('beginDate', ParseDatePipe) beginDate: Date,
        @Query('endDate', ParseDatePipe) endDate: Date,
        @Query('fields') fields: string,
        @User() user: RequestUser,
    ) {
        const userDeviceLink = await UserDeviceLinkDataModel.findOne({
            where: {
                userId: user.userId,
                deviceId,
            },
        });

        if (!userDeviceLink) {
            throw new ForbiddenException(`Запрашиваемое устройство не принадлежит пользователю с ID ${user.userId}.`);
        }

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

        return deviceStates;
    }
}
