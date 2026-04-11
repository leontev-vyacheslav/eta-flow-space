import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FlowDataModel, DeviceDataModel, UserDeviceLinkDataModel } from '../database/models';
import { RequestUser } from '../common/interfaces/request-user.interface';
import { User } from '../common/decorators/user.decorator';
import { InjectModel } from '@nestjs/sequelize';
import { FindOptions } from 'sequelize';

@Controller('api/flows')
export class FlowController {
    constructor(
        @InjectModel(FlowDataModel)
        private readonly flowModel: typeof FlowDataModel,
    ) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    async getFlows(@User() user: RequestUser) {
        const flows = await this.flowModel.findAll({
            attributes: ['id', 'code', 'name', 'description', 'uid'],
            include: [
                {
                    model: DeviceDataModel,
                    as: 'devices',
                    required: true,
                    include: [
                        {
                            model: UserDeviceLinkDataModel,
                            as: 'userDeviceLinks',
                            where: {
                                userId: user.userId,
                            },
                            attributes: [],
                        },
                    ],
                },
            ],
        } as FindOptions);

        return { values: flows };
    }
}
