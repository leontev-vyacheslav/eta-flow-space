import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, literal } from 'sequelize';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';
import { DeviceStateDataModel } from '../database/models';
import { DeviceStateResponseModel } from '../models/device-state-response.model';

@Injectable()
export class DeviceStateService {
    constructor(
        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateModel: typeof DeviceStateDataModel,
        private readonly sharedStoreService: SharedStoreService,
    ) {}

    async getDeviceState(deviceId: number): Promise<DeviceStateResponseModel> {
        const redisState = await this.sharedStoreService.getDeviceState<Record<string, unknown>>(deviceId);

        if (this.isValidState(redisState)) {
            return {
                values: {
                    id: 0,
                    deviceId,
                    state: { isConnected: true, ...redisState },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            };
        }

        return this.getFallbackState(deviceId);
    }

    private isValidState(state: Record<string, unknown> | null): state is Record<string, unknown> {
        if (!state) {
            return false;
        }
        const keys = Object.keys(state);

        return keys.length > 0 && keys.some((k) => state[k] !== null && state[k] !== undefined);
    }

    private async getFallbackState(deviceId: number): Promise<DeviceStateResponseModel> {
        const deviceState = await this.deviceStateModel.findOne({
            where: {
                deviceId,
                [Op.and]: [literal(`state::text <> '{}'`), { state: { [Op.ne]: null } }],
            },
            order: [['createdAt', 'DESC']],
        });

        if (!deviceState) {
            throw new NotFoundException(`Состояние устройства с ID: ${deviceId} не существует.`);
        }

        return {
            values: {
                ...deviceState.toJSON(),
                state: { isConnected: false, ...deviceState.state },
            },
        };
    }
}
