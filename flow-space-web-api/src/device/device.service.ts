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
import { Includeable, Sequelize } from 'sequelize';
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
            attributes: {
                include: [
                    [
                        Sequelize.literal(`(
                        SELECT COALESCE(
                        json_agg(DISTINCT jsonb_build_object(
                            'deviceId', d.id,
                            'deviceCode', d.code,
                            'deviceDescription', d.description,
                            'deviceName', d.name
                        )),
                        '[]'::json
                        )
                        FROM mnemoschema_selector AS s
                        JOIN device AS d ON s."deviceId" = d."id"
                        WHERE s."sourceDeviceId" = "mnemoschemaSelector"."sourceDeviceId"
                        )`),
                        'linkedDevices',
                    ],
                ],
            },
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

    async getDeviceByCode(deviceCode: string): Promise<DeviceDataModel | null> {
        const device = await this.deviceModel.findOne({
            where: { code: deviceCode },
            include: this.BASE_DEVICE_INCLUDES,
        });

        return device;
    }
}
