import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestUserModel } from '../models/request-user.model';
import { User } from '../common/decorators/user.decorator';
import { FlowService } from './flow.service';

@Controller('api/flows')
export class FlowController {
    constructor(private readonly flowsService: FlowService) {}

    @Get()
    @UseGuards(JwtAuthGuard)
    async getFlows(@User() user: RequestUserModel) {
        const flows = this.flowsService.getFlows(user.userId);

        return flows;
    }
}
