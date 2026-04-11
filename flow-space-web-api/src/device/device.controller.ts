import { Controller, Get, UseGuards, Param, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceOwnershipGuard } from '../common/guards/device-ownership.guard';
import { DeviceDataModel, FlowDataModel, ObjectLocationDataModel, UserDeviceLinkDataModel } from '../database/models';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { User } from '../common/decorators/user.decorator';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions } from 'sequelize';

@Controller('api/devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
    constructor(
        @InjectModel(DeviceDataModel)
        private readonly deviceModel: typeof DeviceDataModel,
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
}
