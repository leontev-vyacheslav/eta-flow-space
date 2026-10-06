import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { literal } from 'sequelize';
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
            // The side menu is built from these flows; a flow with one device is shown as that device, so the flows
            // follow their first device's "order" and the devices inside a flow follow their own (no order last, ties by id).
            order: [
                [literal('(SELECT MIN(d."order") FROM device AS d WHERE d."flowId" = "FlowDataModel"."id")'), 'ASC NULLS LAST'],
                ['id', 'ASC'],
                [{ model: DeviceDataModel, as: 'devices' }, 'order', 'ASC NULLS LAST'],
                [{ model: DeviceDataModel, as: 'devices' }, 'id', 'ASC'],
            ],
        });

        return flows;
    }
}
