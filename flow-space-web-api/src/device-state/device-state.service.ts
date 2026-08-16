import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, ProjectionAlias, literal } from 'sequelize';
import { SharedStoreService } from '../common/services/shared-store/shared-store.service';
import { DeviceStateDataModel, MnemoschemaSelectorDataModel, DeviceDataModel } from '../database/models';
import { I18nService } from 'nestjs-i18n';

function fieldToJsonbPath(field: string): string {
    const parts = field.split('.');
    return parts
        .map((part, i) => {
            const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
            if (arrayMatch) {
                const [, key, index] = arrayMatch;
                const op = i === parts.length - 1 ? '->>' : '->';
                return `-> '${key}' ${op} ${index}`;
            }
            const op = i === parts.length - 1 ? '->>' : '->';
            return `${op} '${part}'`;
        })
        .join(' ');
}

@Injectable()
export class DeviceStateService {
    constructor(
        @InjectModel(DeviceDataModel)
        private readonly deviceModel: typeof DeviceDataModel,
        @InjectModel(DeviceStateDataModel)
        private readonly deviceStateModel: typeof DeviceStateDataModel,
        @InjectModel(MnemoschemaSelectorDataModel)
        private readonly mnemoschemaSelectorModel: typeof MnemoschemaSelectorDataModel,
        private readonly sharedStoreService: SharedStoreService,
        private readonly i18n: I18nService,
    ) {}

    async getDeviceStatesByDates(deviceId: number, beginDate: Date, endDate: Date, fields: string[]): Promise<DeviceStateDataModel[]> {
        const deviceStateFields: ProjectionAlias[] = fields.map((f): ProjectionAlias => [literal(`"DeviceStateDataModel"."state" ${fieldToJsonbPath(f)}`), f]);

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

    async getDeviceStates(targetDeviceId: number): Promise<Record<string, Partial<DeviceStateDataModel>>> {
        const result: Record<string, Partial<DeviceStateDataModel>> = {};
        const mnemoschemaSelector = await this.mnemoschemaSelectorModel.findOne({
            attributes: ['sourceDeviceId'],
            where: {
                deviceId: targetDeviceId,
            },
        });
        const linkedDevices = await this.mnemoschemaSelectorModel.findAll({
            attributes: ['deviceId'],
            where: {
                sourceDeviceId: mnemoschemaSelector?.sourceDeviceId,
            },
            include: [
                {
                    model: this.deviceModel,
                    as: 'device',
                    attributes: ['code'],
                    required: true,
                },
            ],
        });

        // TODO: need to be refactored
        if (linkedDevices.length === 0) {
            const fallbackState = await this.getFallbackState(targetDeviceId);

            return { [targetDeviceId]: fallbackState };
        }

        for (const linkedDevice of linkedDevices) {
            const linkedDeviceId = linkedDevice.deviceId;
            const redisState = await this.sharedStoreService.getDeviceState<Record<string, unknown>>(linkedDeviceId);

            if (this.isValidState(redisState)) {
                result[linkedDevice.device.code] = {
                    id: 0,
                    deviceId: linkedDeviceId,
                    state: { isConnected: true, ...redisState },
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            } else {
                const fallbackState = await this.getFallbackState(linkedDeviceId);
                result[linkedDevice.device.code] = fallbackState;
            }
        }

        return result;
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
                [Op.and]: [literal(`state <> '{}'::jsonb`), { state: { [Op.ne]: null } }],
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
