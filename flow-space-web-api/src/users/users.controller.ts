import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../common/decorators/user.decorator';
import { RequestUserModel } from '../models';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('settings')
    async getSettings(@User() user: RequestUserModel) {
        return await this.usersService.getSettings(user.userId);
    }
}
