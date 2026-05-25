import { Module } from '@nestjs/common';
import { QuickHelpController } from './quick-help.controller';

@Module({
    controllers: [QuickHelpController],
})
export class QuickHelpModule {}
