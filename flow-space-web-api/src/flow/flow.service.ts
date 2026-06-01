import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DeviceDataModel, FlowDataModel, UserDeviceLinkDataModel } from '../database/models';

@Injectable()
export class FlowService {
    constructor(
        @InjectModel(FlowDataModel)
        private readonly flowModel: typeof FlowDataModel,
    ) {}

    async getFlows(userId: number) {
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
                                userId: userId,
                            },
                            attributes: [],
                        },
                    ],
                },
            ],
        });

        return flows;
    }
}
