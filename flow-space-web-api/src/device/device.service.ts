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
import { Includeable, Order } from 'sequelize';

// device lists: by "order" ascending, devices without one last, ties by id
export const DEVICE_LIST_ORDER: Order = [
    ['order', 'ASC NULLS LAST'],
    ['id', 'ASC'],
];
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

    // The devices that share this device's diagram (selectors with the same source device). A device without a
    // selector shows its own diagram alone, the same as a selector that points to itself.
    private async getLinkedDevices(deviceId: number): Promise<DeviceDataModel[]> {
        const attributes = ['id', 'code', 'description', 'name'];
        const source = await this.mnemoschemaSelectorModel.findOne({
            attributes: ['sourceDeviceId'],
            where: { deviceId: deviceId },
        });

        if (!source) {
            return this.deviceModel.findAll({ attributes, where: { id: deviceId } });
        }

        const selectors = await this.mnemoschemaSelectorModel.findAll({
            where: { sourceDeviceId: source.sourceDeviceId },
            include: [
                {
                    model: DeviceDataModel,
                    as: 'device',
                    attributes,
                    required: true,
                },
            ],
        });

        return selectors.map((s) => s.device);
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
            order: DEVICE_LIST_ORDER,
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
                  // no selector: the device's own diagram
                  mnemoschemaCode: device.mnemoschemaSelector?.sourceDevice?.code ?? device.code,
                  linkedDevices,
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
