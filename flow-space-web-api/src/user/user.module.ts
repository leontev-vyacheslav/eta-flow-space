import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserService } from './user.service';
import { UserDataModel } from '../database/models/user.data-model';
import { UserController } from './user.controller';

@Module({
    imports: [SequelizeModule.forFeature([UserDataModel])],
    providers: [UserService],
    controllers: [UserController],
    exports: [UserService],
})
export class UserModule {}
