import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUserModel } from '../models/request-user.model';
import { User } from '../common/decorators/user.decorator';
import { FlowService } from './flow.service';
import { UserCacheInterceptor } from '../common/interceptors/user-cache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('api/flows')
@UseGuards(JwtAuthGuard)
@UseInterceptors(UserCacheInterceptor)
@CacheTTL(300_000)
export class FlowController {
    constructor(private readonly flowsService: FlowService) {}

    @Get()
    async getFlows(@User() user: RequestUserModel) {
        const flows = this.flowsService.getFlows(user.userId);

        return flows;
    }
}
