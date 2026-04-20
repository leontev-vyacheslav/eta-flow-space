import { Injectable } from '@nestjs/common';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';
import { InjectModel } from '@nestjs/sequelize';
import { DeviceDataModel, EmergencyStateDataModel, UserDeviceLinkDataModel } from '../database/models';
import { Op, col } from 'sequelize';

@Injectable()
export class EmergencyStateService {
    constructor(
        private readonly sharedStoreService: SharedStoreService,
        @InjectModel(EmergencyStateDataModel)
        private readonly emergencyStateModel: typeof EmergencyStateDataModel,
        @InjectModel(DeviceDataModel)
        private readonly deviceModel: typeof DeviceDataModel,
        @InjectModel(UserDeviceLinkDataModel)
        private readonly userDeviceLinkModel: typeof UserDeviceLinkDataModel,
    ) {}

    public async getUserStoredStatesByDates(userId: number, beginDate: Date, endDate: Date) {
        const emergencyStates = await EmergencyStateDataModel.findAll({
            attributes: ['id', 'deviceId', [col('device.name'), 'deviceName'], 'state', 'createdAt'],
            include: [
                {
                    model: DeviceDataModel,
                    as: 'device',
                    required: true,
                    attributes: [],
                    include: [
                        {
                            model: UserDeviceLinkDataModel,
                            as: 'userDeviceLinks',
                            required: true,
                            attributes: [],
                            where: {
                                userId: userId,
                            },
                        },
                    ],
                },
            ],
            where: {
                createdAt: {
                    [Op.between]: [beginDate, endDate],
                },
            },
        });

        return emergencyStates;
    }

    public async getDeviceStoredStatesByDates(deviceId: number, beginDate: Date, endDate: Date) {
        const emergencyStates = await EmergencyStateDataModel.findAll({
            attributes: ['id', 'deviceId', [col('device.name'), 'deviceName'], 'state', 'createdAt'],
            include: [
                {
                    model: DeviceDataModel,
                    as: 'device',
                    required: true,
                    attributes: [],
                },
            ],
            where: {
                deviceId: deviceId,
                createdAt: {
                    [Op.between]: [beginDate, endDate],
                },
            },
        });

        return emergencyStates;
    }

    public async getCurrentStates(userId: number) {
        const devices = await DeviceDataModel.findAll({
            attributes: ['id'],
            include: [
                {
                    model: UserDeviceLinkDataModel,
                    required: true,
                    as: 'userDeviceLinks',
                    where: {
                        userId: userId,
                    },
                    attributes: [],
                },
            ],
        });

        const emergencyStates: Array<{ deviceId: number } & Record<string, unknown>> = [];
        for (const d of devices) {
            const state = await this.sharedStoreService.getEmergencyState<Record<string, unknown>>(d.id);
            if (state) {
                emergencyStates.push({ deviceId: d.id, ...state });
            }
        }

        return emergencyStates;
    }
}
