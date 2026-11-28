import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ObjectLocationDataModel } from '../../../database/models';
import { SharedStoreModule } from '../shared-store/shared-store.module';
import { WeatherForecastService } from './weather-forecast.service';

@Module({
    imports: [SequelizeModule.forFeature([ObjectLocationDataModel]), SharedStoreModule],
    providers: [WeatherForecastService],
    exports: [WeatherForecastService],
})
export class WeatherForecastModule {}
