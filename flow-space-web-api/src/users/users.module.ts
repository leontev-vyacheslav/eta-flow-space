import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersService } from './users.service';
import { UserDataModel } from '../database/models/user.data-model';

@Module({
    imports: [SequelizeModule.forFeature([UserDataModel])],
    providers: [UsersService],
    controllers: [],
    exports: [UsersService],
})
export class UsersModule {}
