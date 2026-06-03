import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersService } from './users.service';
import { UserDataModel } from '../database/models/user.data-model';
import { UsersController } from './users.controller';

@Module({
    imports: [SequelizeModule.forFeature([UserDataModel])],
    providers: [UsersService],
    controllers: [UsersController],
    exports: [UsersService],
})
export class UsersModule {}
