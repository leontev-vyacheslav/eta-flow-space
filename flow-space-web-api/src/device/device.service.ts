import { Injectable } from '@nestjs/common';
import {
    DeviceDataModel,
    FlowDataModel,
    MnemoschemaSelectorDataModel,
    ObjectLocationDataModel,
    ReportDataModel,
    UserDeviceLinkDataModel,
} from '../database/models';
import { InjectModel } from '@nestjs/sequelize';
import { Includeable } from 'sequelize';

@Injectable()
export class DeviceService {
    private readonly BASE_DEVICE_INCLUDES: Includeable[] = [
        { model: FlowDataModel, as: 'flow' },
        { model: ObjectLocationDataModel, as: 'objectLocation' },
        { model: ReportDataModel, as: 'reports', limit: 10 },
        {
            model: MnemoschemaSelectorDataModel,
            as: 'mnemoschemaSelector',
            include: [
                { model: DeviceDataModel, as: 'device', attributes: ['id', 'code', 'description'] },
                { model: DeviceDataModel, as: 'sourceDevice', attributes: ['id', 'code', 'description'] },
            ],
        },
    ];

    constructor(@InjectModel(DeviceDataModel) private readonly deviceModel: typeof DeviceDataModel) {}

    async getDevices(userId: number): Promise<DeviceDataModel[]> {
        const devices = await this.deviceModel.findAll({
            include: [
                ...this.BASE_DEVICE_INCLUDES,
                {
                    model: UserDeviceLinkDataModel,
                    as: 'userDeviceLinks',
                    where: {
                        userId: userId,
                    },
                    attributes: [],
                },
            ],
        });

        return devices;
    }

    async getDevice(deviceId: number): Promise<DeviceDataModel | null> {
        const device = await this.deviceModel.findByPk(deviceId, {
            include: this.BASE_DEVICE_INCLUDES,
        });

        return device;
    }
}
