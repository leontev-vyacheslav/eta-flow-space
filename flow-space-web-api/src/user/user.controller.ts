import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../common/decorators/user.decorator';
import { RequestUserModel } from '../models';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserSettingsModel } from '../models/user-settings.model';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UserController {
    constructor(private readonly usersService: UserService) {}

    @Get('settings')
    async getSettings(@User() user: RequestUserModel) {
        return await this.usersService.getSettings(user.userId);
    }

    @Post('settings')
    async postSettings(@Body() settings: UserSettingsModel, @User() user: RequestUserModel) {
        await this.usersService.postSettings(user.userId, settings);
    }
}
