import { Injectable } from '@nestjs/common';
import { DeviceDataModel, FlowDataModel, ObjectLocationDataModel, ReportDataModel, UserDeviceLinkDataModel } from '../database/models';
import { InjectModel } from '@nestjs/sequelize';
import { Includeable } from 'sequelize';

@Injectable()
export class DeviceService {
    private readonly BASE_DEVICE_INCLUDES: Includeable[] = [
        { model: FlowDataModel, as: 'flow' },
        { model: ObjectLocationDataModel, as: 'objectLocation' },
        { model: ReportDataModel, as: 'reports', limit: 10 },
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
