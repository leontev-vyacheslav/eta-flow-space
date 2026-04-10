import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UserDataModel } from '../database/models/user.data-model';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(UserDataModel)
        private userModel: typeof UserDataModel,
    ) {}

    async findByName(name: string): Promise<UserDataModel | null> {
        return this.userModel.findOne({ where: { name } });
    }
}
