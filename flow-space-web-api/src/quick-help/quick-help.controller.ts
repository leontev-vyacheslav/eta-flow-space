import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUserModel } from '../models/request-user.model';
import { User } from '../common/decorators/user.decorator';


@Controller('api/quick-helps')
export class QuickHelpController {
    constructor(

    ) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    async getQuickHelps(@User() user: RequestUserModel) {

        return { values: null };
    }
}
