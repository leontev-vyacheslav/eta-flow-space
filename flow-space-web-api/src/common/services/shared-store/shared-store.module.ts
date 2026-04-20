import { Module } from '@nestjs/common';
import { SharedStoreService } from './shared-store.service';

@Module({
    providers: [SharedStoreService],
    exports: [SharedStoreService],
})
export class SharedStoreModule {}
