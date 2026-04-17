import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TaskScheduledService {
    private readonly logger = new Logger(TaskScheduledService.name);

    @Cron('0 */1 * * * *')
    handleCron() {
        this.logger.debug('Testing cron job');
    }
}
