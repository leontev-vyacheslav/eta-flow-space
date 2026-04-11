import { Injectable, CanActivate, ExecutionContext, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserDeviceLinkDataModel } from '../../database/models';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

interface DeviceParamRequest extends AuthenticatedRequest {
    params: {
        deviceId: string;
    };
}

@Injectable()
export class DeviceOwnershipGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<DeviceParamRequest>();
        const userId = request.user?.userId;
        const deviceId = Number(request.params.deviceId);

        if (!userId) {
            throw new UnauthorizedException('Пользователь не авторизован.');
        }

        if (!deviceId || isNaN(deviceId)) {
            throw new BadRequestException('Параметр deviceId отсутствует или не является числом.');
        }

        const userDeviceLink = await UserDeviceLinkDataModel.findOne({
            where: { userId, deviceId },
        });

        if (!userDeviceLink) {
            throw new ForbiddenException(`Запрашиваемое устройство не принадлежит пользователю с ID ${userId}.`);
        }

        return true;
    }
}
