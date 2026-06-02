import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserDeviceLinkDataModel } from '../../database/models';
import { AuthenticatedRequestModel } from '../../models/authenticated-request.model';
import { I18nService } from 'nestjs-i18n';

interface DeviceParamRequest extends AuthenticatedRequestModel {
    params: {
        deviceId: string;
    };
}

@Injectable()
export class DeviceOwnershipGuard implements CanActivate {
    constructor(private readonly i18n: I18nService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<DeviceParamRequest>();
        const userId = request.user?.userId;
        const deviceId = Number(request.params.deviceId);

        if (!userId) {
            throw new UnauthorizedException(this.i18n.t('errors.USER_NOT_AUTHORIZED'));
        }

        if (!deviceId || isNaN(deviceId)) {
            throw new BadRequestException(this.i18n.t('errors.DEVICE_ID_MISSING_OR_NOT_NUMBER'));
        }

        const userDeviceLink = await UserDeviceLinkDataModel.findOne({
            where: { userId, deviceId },
        });

        if (!userDeviceLink) {
            throw new ForbiddenException(this.i18n.t('errors.DEVICE_NOT_BELONGS_TO_USER', { args: { userId } }));
        }

        return true;
    }
}
