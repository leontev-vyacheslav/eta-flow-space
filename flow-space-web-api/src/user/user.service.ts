import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserDataModel } from '../database/models/user.data-model';
import { I18nService } from 'nestjs-i18n';
import { AuthUserModel } from '../models/auth-user.model';
import { UserSettingsModel } from '../models/user-settings.model';

@Injectable()
export class UserService {
    constructor(
        private readonly i18n: I18nService,
        @InjectModel(UserDataModel)
        private userModel: typeof UserDataModel,
    ) {}

    async getByName(name: string): Promise<AuthUserModel | null> {
        return (await this.userModel.findOne({ attributes: ['id', 'name', 'password', 'roleId'], where: { name } })) as AuthUserModel;
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

    async postSettings(userId: number, settings: UserSettingsModel) {
        const user = await this.userModel.findByPk(userId);
        if (!user) {
            throw new NotFoundException(this.i18n.t('errors.USER_NOT_FOUND'));
        }

        user.settings = settings;
        return user.save();
    }
}
