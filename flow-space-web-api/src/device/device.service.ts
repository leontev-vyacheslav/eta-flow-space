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
        {
            model: FlowDataModel,
            as: 'flow',
            attributes: ['id', 'code', 'description', 'name', 'uid'],
            include: [{ model: DeviceDataModel, as: 'devices', attributes: ['id'] }],
        },
        { model: ObjectLocationDataModel, as: 'objectLocation' },
        { model: ReportDataModel, as: 'reports', limit: 10 },
        {
            model: MnemoschemaSelectorDataModel,
            as: 'mnemoschemaSelector',
            attributes: ['id', 'sourceDeviceId'],
            include: [
                {
                    model: DeviceDataModel,
                    as: 'sourceDevice',
                    attributes: ['code'],
                },
            ],
        },
    ];

    constructor(
        @InjectModel(DeviceDataModel) private readonly deviceModel: typeof DeviceDataModel,
        @InjectModel(MnemoschemaSelectorDataModel) private readonly mnemoschemaSelectorModel: typeof MnemoschemaSelectorDataModel,
    ) {}

    private async getLinkedDevices(deviceId: number) {
        const source = await this.mnemoschemaSelectorModel.findOne({
            attributes: ['sourceDeviceId'],
            where: { deviceId: deviceId },
            include: [
                {
                    model: DeviceDataModel,
                    as: 'device',
                    attributes: ['id', 'code', 'description', 'name'],
                    required: true,
                },
            ],
        });

        if (!source) {
            return [];
        }

        return this.mnemoschemaSelectorModel.findAll({
            where: { sourceDeviceId: source.sourceDeviceId },
            include: [
                {
                    model: DeviceDataModel,
                    as: 'device',
                    attributes: ['id', 'code', 'description', 'name'],
                    required: true,
                },
            ],
        });
    }

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

    async getDevice(deviceId: number): Promise<Partial<DeviceDataModel> | null> {
        const device = await this.deviceModel.findByPk(deviceId, {
            include: this.BASE_DEVICE_INCLUDES,
        });

        const linkedDevices = await this.getLinkedDevices(deviceId);

        return device
            ? ({
                  id: device.id,
                  code: device.code,
                  description: device.description,
                  name: device.name,
                  flow: device.flow,
                  objectLocation: device.objectLocation,
                  reports: device.reports,
                  mnemoschemaCode: device.mnemoschemaSelector!.sourceDevice?.code,
                  linkedDevices: linkedDevices.map((d) => d.device),
              } as DeviceDataModel & {
                  mnemoschemaCode?: string;
                  linkedDevices: DeviceDataModel[];
              })
            : null;
    }

    async getDeviceByCode(deviceCode: string): Promise<DeviceDataModel | null> {
        const device = await this.deviceModel.findOne({
            where: { code: deviceCode },
        });

        return device;
    }
}
