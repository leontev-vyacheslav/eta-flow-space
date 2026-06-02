import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, ProjectionAlias, json, literal } from 'sequelize';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';
import { DeviceStateDataModel } from '../database/models';
import { Literal } from 'sequelize/lib/utils';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class DeviceStateService {
    constructor(
        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateModel: typeof DeviceStateDataModel,
        private readonly sharedStoreService: SharedStoreService,
        private readonly i18n: I18nService,
    ) {}

    async getDeviceStatesByDates(deviceId: number, beginDate: Date, endDate: Date, fields: string[]): Promise<DeviceStateDataModel[]> {
        const deviceStateFields: ProjectionAlias[] = fields.map((f): ProjectionAlias => [json(`state.${f}`) as unknown as Literal, f]);

        const deviceStates = await this.deviceStateModel.findAll({
            attributes: ['id', 'deviceId', ...deviceStateFields, 'createdAt'],
            where: {
                deviceId: deviceId,
                createdAt: {
                    [Op.between]: [beginDate, endDate],
                },
            },
        });

        return deviceStates;
    }

    async getDeviceState(deviceId: number): Promise<Partial<DeviceStateDataModel>> {
        const redisState = await this.sharedStoreService.getDeviceState<Record<string, unknown>>(deviceId);

        if (this.isValidState(redisState)) {
            return {
                id: 0,
                deviceId,
                state: { isConnected: true, ...redisState },
                createdAt: new Date(),
                updatedAt: new Date(),
            } as Partial<DeviceStateDataModel>;
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

    private async getFallbackState(deviceId: number): Promise<Partial<DeviceStateDataModel>> {
        const deviceState = await this.deviceStateModel.findOne({
            where: {
                deviceId,
                [Op.and]: [literal(`state::text <> '{}'`), { state: { [Op.ne]: null } }],
            },
            order: [['createdAt', 'DESC']],
        });

        if (!deviceState) {
            throw new NotFoundException(
                this.i18n.t('errors.DEVICE_STATE_NOT_EXISTS', {
                    args: { deviceId },
                }),
            );
        }

        return {
            ...deviceState.toJSON(),
            state: { isConnected: false, ...deviceState.state },
        } as Partial<DeviceStateDataModel>;
    }
}
