import { Module } from '@nestjs/common';
import { DataSchemasService } from './data-schemas.service';

@Module({
    providers: [DataSchemasService],
    exports: [DataSchemasService],
})
export class DataSchemasModule {}
