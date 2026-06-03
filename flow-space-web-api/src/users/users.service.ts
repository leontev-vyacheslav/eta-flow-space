import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserDataModel } from '../database/models/user.data-model';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UsersService {
    constructor(
        private readonly i18n: I18nService,
        @InjectModel(UserDataModel)
        private userModel: typeof UserDataModel,
    ) {}

    async getByName(name: string): Promise<Partial<UserDataModel> | null> {
        return this.userModel.findOne({ attributes: ['id', 'name', 'password', 'roleId'], where: { name } });
    }

    async getSettings(userId: number): Promise<Record<string, unknown>> {
        const user = await this.userModel.findByPk(userId, {
            attributes: ['settings'],
        });
        if (!user?.settings) {
            throw new NotFoundException(this.i18n.t('errors.USER_SETTINGS_NOT_FOUND'));
        }

        return user.settings;
    }
}
