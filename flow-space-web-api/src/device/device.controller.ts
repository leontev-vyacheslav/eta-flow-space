import { Controller, Get, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { DeviceDataModel, FlowDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel, ReportDataModel } from '../database/models';
import { RequestUserModel } from '../models/request-user.model';
import { User } from '../common/decorators/user.decorator';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions } from 'sequelize';
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

        @InjectModel(ReportDataModel)
        private readonly reportModel: typeof ReportDataModel,

        private readonly configService: ConfigService,
    ) {}

    @Get('')
    async getDevices(@User() user: RequestUserModel) {
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
                {
                    model: ReportDataModel,
                    as: 'reports',
                },
            ],
        } as FindOptions);

        return devices;
    }

    @Get(':deviceId')
    @UseGuards(DeviceOwnershipGuard)
    async getDevice(@Param('deviceId', ParseIntPipe) deviceId: number) {
        const device = await this.deviceModel.findOne({
            include: [
                {
                    model: ReportDataModel,
                    as: 'reports',
                },
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

        return device;
    }
}
